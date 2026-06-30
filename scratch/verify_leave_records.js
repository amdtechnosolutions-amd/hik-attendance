import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import moment from 'moment';
dotenv.config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://gba:gba7373@127.0.0.1:41111/hik_attendance_milti?authSource=admin';
const uriParts = MONGO_URI.split('?');
const baseUrl = uriParts[0];
const queryParams = uriParts.length > 1 ? `?${uriParts[1]}` : '';
const newBaseUrl = baseUrl.replace(/\/[^/]*$/, '/ves_mncvv');
const targetUri = `${newBaseUrl}${queryParams}`;

const leaveData = [
  {
    rawEmpId: "MNCVV-070",
    empId: "070",
    name: "SMT. ANU K",
    date: "09-06-2026",
    type: "half-day-afternoon"
  },
  {
    rawEmpId: "MNCVV-97",
    empId: "97",
    name: "MUTHUKUMARI",
    date: "01-06-2026",
    type: "half-day-morning"
  }
];

async function verifyLeaveRecords() {
  const client = new MongoClient(targetUri);
  try {
    await client.connect();
    const db = client.db('ves_mncvv');
    const usersCollection = db.collection('users');
    const leavesCollection = db.collection('leaves');

    let allVerified = true;

    console.log("\n--- Leave Verification Report ---");
    for (const record of leaveData) {
      const user = await usersCollection.findOne({ employeeNo: record.empId });
      if (!user) {
        console.error(`[FAIL]   User not found for employee ID: ${record.rawEmpId}`);
        allVerified = false;
        continue;
      }

      const leaveDate = moment(record.date, "DD-MM-YYYY").toDate();
      const existing = await leavesCollection.findOne({
        userId: user._id,
        leaveDate: leaveDate,
        type: record.type
      });

      if (existing) {
        console.log(`[VERIFIED] ${record.rawEmpId} (${user.name}) on date ${record.date} exists in DB (ID: ${existing._id}, Type: ${existing.type}, Status: ${existing.status})`);
      } else {
        console.error(`[FAIL]     No leave record found for ${record.rawEmpId} (${user.name}) on date ${record.date} (Type: ${record.type})`);
        allVerified = false;
      }
    }

    console.log(`\nFinal Leave Verification Result: ${allVerified ? "SUCCESS - All leave records verified in database!" : "FAILURE - Some leave records are missing!"}`);

  } catch (err) {
    console.error("Verification Error:", err);
  } finally {
    await client.close();
  }
}

verifyLeaveRecords();
