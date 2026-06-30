import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import moment from 'moment';
dotenv.config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://gba:gba7373@127.0.0.1:41111/hik_attendance_milti?authSource=admin';
const uriParts = MONGO_URI.split('?');
const baseUrl = uriParts[0];
const queryParams = uriParts.length > 1 ? `?${uriParts[1]}` : '';
const newBaseUrl = baseUrl.replace(/\/[^/]*$/, '/ves_mncvv');
const targetUri = `${newBaseUrl}${queryParams}`;
const institutionId = new ObjectId("68e0e148f633a16a99a9df2e");

const leaveData = [
  {
    rawEmpId: "MNCVV-070",
    empId: "070",
    name: "SMT. ANU K",
    date: "09-06-2026",
    type: "half-day-afternoon",
    reason: "Leave request (Afternoon)"
  },
  {
    rawEmpId: "MNCVV-97",
    empId: "97",
    name: "MUTHUKUMARI",
    date: "01-06-2026",
    type: "half-day-morning",
    reason: "Leave request (Morning)"
  }
];

async function insertLeaveRecords() {
  const client = new MongoClient(targetUri);
  try {
    await client.connect();
    console.log("Connected to ves_mncvv database");
    const db = client.db('ves_mncvv');
    const usersCollection = db.collection('users');
    const leavesCollection = db.collection('leaves');

    let insertedCount = 0;
    let skippedCount = 0;

    for (const record of leaveData) {
      const user = await usersCollection.findOne({ employeeNo: record.empId });
      if (!user) {
        console.error(`[ERROR] User not found for employee ID: ${record.rawEmpId}`);
        continue;
      }

      const leaveDate = moment(record.date, "DD-MM-YYYY").toDate();

      // Check for duplicate leave
      const existing = await leavesCollection.findOne({
        userId: user._id,
        leaveDate: leaveDate,
        type: record.type
      });

      if (existing) {
        console.log(`[SKIP] Leave already exists for ${record.rawEmpId} (${user.name}) on date ${record.date} (Type: ${record.type})`);
        skippedCount++;
        continue;
      }

      // Insert leave record as approved
      const result = await leavesCollection.insertOne({
        institutionId: institutionId,
        userId: user._id,
        employeeNo: user.employeeNo,
        leaveDate: leaveDate,
        type: record.type,
        reason: record.reason,
        status: "approved",
        approvalDate: new Date(),
        comments: "Inserted by Administrator",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      if (result.acknowledged) {
        console.log(`[INSERTED] Leave record created for ${record.rawEmpId} (${user.name}) on date ${record.date} (Type: ${record.type})`);
        insertedCount++;
      } else {
        console.error(`[ERROR] Failed to insert leave record for ${record.rawEmpId} on date ${record.date}`);
      }
    }

    console.log(`\n--- Leave Execution Summary ---`);
    console.log(`Total records processed: ${leaveData.length}`);
    console.log(`Successfully inserted:  ${insertedCount}`);
    console.log(`Skipped (duplicates):  ${skippedCount}`);

  } catch (err) {
    console.error("Leave Migration Error:", err);
  } finally {
    await client.close();
  }
}

insertLeaveRecords();
