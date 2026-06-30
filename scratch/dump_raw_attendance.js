import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function dumpRawAttendance() {
  const institutionId = '68e0e148f633a16a99a9df2e'; // MNCVV
  const MONGO_URI = process.env.MONGO_URI;

  try {
    console.log('Connecting to Master DB...');
    await mongoose.connect(MONGO_URI);
    
    // Get institution info to find dbName
    const instCol = mongoose.connection.db.collection('institutions');
    const inst = await instCol.findOne({ _id: new mongoose.Types.ObjectId(institutionId) });
    
    if (!inst) {
      console.error('Institution not found');
      await mongoose.disconnect();
      return;
    }

    console.log(`Connecting to Institution DB: ${inst.dbName}...`);
    const baseUri = MONGO_URI.replace(/\/[^/?]+(\?|$)/, `/${inst.dbName}$1`);
    const instConn = await mongoose.createConnection(baseUri).asPromise();
    
    console.log('Fetching last 5 attendance records...');
    const attendanceCol = instConn.db.collection('attendances');
    const records = await attendanceCol.find({}).sort({ timestamp: -1 }).limit(5).toArray();

    if (records.length === 0) {
      console.log('No attendance records found in DB.');
    } else {
      console.log('\n--- LAST 5 ATTENDANCE RECORDS (WITH RAW DEVICE PAYLOAD) ---\n');
      records.forEach((record, index) => {
        console.log(`Record #${index + 1}:`);
        console.log(JSON.stringify(record, null, 2));
        console.log('---------------------------------------------------\n');
      });
    }

    await instConn.close();
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

dumpRawAttendance();
