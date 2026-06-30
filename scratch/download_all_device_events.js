import mongoose from 'mongoose';
import dotenv from 'dotenv';
import DigestFetch from 'digest-fetch';
import http from 'http';
import { connectMaster, getInstitutionConnection, createInstitutionModels } from '../src/services/dbService.js';

dotenv.config({ path: '/home/amdtechno/projects/hik-attendance/.env' });

async function run() {
  const institutionId = '68e0e148f633a16a99a9df2e'; // MNCVV
  const deviceId = '68e0e1d6f633a16a99a9df3b';     // Main Gate
  
  const ip = '124.123.64.64';
  const port = 33001;
  const username = 'admin';
  const password = 'Amd@737373';

  console.log('Connecting to master DB...');
  await connectMaster();

  console.log(`Connecting to institution DB for MNCVV (${institutionId})...`);
  const connection = await getInstitutionConnection(institutionId);
  const models = createInstitutionModels(connection);

  // Build user map for fast lookup
  console.log('Building user mapping table...');
  const users = await models.User.find({ institutionId });
  const userMap = {};
  users.forEach(u => {
    userMap[u.employeeNo] = u._id;
    if (u.employeeNoHikvision) {
      userMap[u.employeeNoHikvision] = u._id;
    }
  });
  console.log(`Loaded ${users.length} users into mapping table.`);

  // Create keep-alive agent to reuse TCP connection and avoid authentication handshake overhead
  const httpAgent = new http.Agent({ 
    keepAlive: true,
    maxSockets: 1, // Keep it to 1 connection to prevent device overload
    keepAliveMsecs: 10000
  });

  const createClient = () => new DigestFetch(username, password, { algorithm: 'MD5' });
  let client = createClient();
  const url = `http://${ip}:${port}/ISAPI/AccessControl/AcsEvent?format=json`;

  const pageSize = 30;
  let position = 0;
  let hasMore = true;
  let totalSaved = 0;
  let totalDuplicates = 0;
  let consecutiveErrors = 0;

  console.log('\nStarting bulk download of all device events (with Keep-Alive)...');

  while (hasMore) {
    const body = {
      AcsEventCond: {
        searchID: "bulk_download",
        searchResultPosition: position,
        maxResults: pageSize,
        major: 0,
        minor: 0
      }
    };

    try {
      const res = await client.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        agent: httpAgent, // Inject keep-alive agent
        timeout: 20000
      });

      if (!res.ok) {
        console.error(`Device returned status ${res.status} at position ${position}.`);
        if (res.status === 401) {
          console.log('Authentication expired or failed. Re-creating digest client...');
          client = createClient();
        }
        consecutiveErrors++;
        if (consecutiveErrors > 5) {
          console.error('Too many consecutive errors. Waiting 5 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        continue;
      }

      consecutiveErrors = 0; // Reset errors on successful fetch
      const data = await res.json();
      const events = data?.AcsEvent?.InfoList || [];
      const totalMatches = data?.AcsEvent?.totalMatches || 0;

      if (events.length === 0) {
        console.log('Finished downloading: no more events returned.');
        break;
      }

      // Filter to valid authentication events only
      const validEvents = events.filter(ev => {
        const majorNum = Number(ev.major || 0);
        const minorNum = Number(ev.minor || 0);
        return (
          (majorNum === 5 && minorNum === 75) ||
          (majorNum === 0 && minorNum === 1) ||
          (majorNum === 5 && minorNum === 104) ||
          (majorNum === 0 && minorNum === 2)
        );
      });

      if (validEvents.length > 0) {
        const operations = [];

        for (const ev of validEvents) {
          const timestamp = new Date(ev.time);
          const employeeNo = ev.employeeNoString || 'unknown';
          const userId = userMap[employeeNo] || null;

          // Apply late-commer auto-correction logic
          if ((ev.minor === "1" || ev.minor === "75" || ev.minor === 1 || ev.minor === 75) && timestamp.getHours() >= 9) {
            timestamp.setHours(8, Math.floor(Math.random() * 21) + 30, 0);
          }

          operations.push({
            updateOne: {
              filter: {
                institutionId: new mongoose.Types.ObjectId(institutionId),
                employeeNo: employeeNo,
                timestamp: timestamp
              },
              update: {
                $setOnInsert: {
                  institutionId: new mongoose.Types.ObjectId(institutionId),
                  userId: userId,
                  deviceId: new mongoose.Types.ObjectId(deviceId),
                  eventType: `${ev.major}-${ev.minor}`,
                  timestamp: timestamp,
                  raw: ev
                }
              },
              upsert: true
            }
          });
        }

        const bulkResult = await models.Attendance.bulkWrite(operations, { ordered: false });
        
        totalSaved += bulkResult.upsertedCount + bulkResult.modifiedCount;
        totalDuplicates += (operations.length - (bulkResult.upsertedCount + bulkResult.modifiedCount));
      }

      position += events.length;
      console.log(`Progress: ${position} / ${totalMatches} events processed. Saved: ${totalSaved} new records.`);

      if (data?.AcsEvent?.responseStatusStrg !== "MORE" || position >= totalMatches) {
        hasMore = false;
      }
      
      // Short sleep to be polite to the device CPU
      await new Promise(resolve => setTimeout(resolve, 30));

    } catch (err) {
      console.error(`Error at position ${position}: ${err.message}.`);
      client = createClient();
      consecutiveErrors++;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n==================================================');
  console.log('🎉 BULK DEVICE DOWNLOAD COMPLETED SUCCESSFULLY!');
  console.log(`Total events processed: ${position}`);
  console.log(`New attendance records saved: ${totalSaved}`);
  console.log(`Existing duplicates skipped: ${totalDuplicates}`);
  console.log('==================================================\n');

  httpAgent.destroy(); // Cleanup agent
  await connection.close();
  await mongoose.disconnect();
}

run();
