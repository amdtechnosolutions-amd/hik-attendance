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

async function updateLeaveApproved() {
  const client = new MongoClient(targetUri);
  try {
    await client.connect();
    const db = client.db('ves_mncvv');
    const usersCollection = db.collection('users');
    const leavesCollection = db.collection('leaves');

    const user = await usersCollection.findOne({ employeeNo: "97" });
    if (!user) {
      console.error("[ERROR] User MNCVV-97 not found");
      return;
    }

    const leaveDate = moment("01-06-2026", "DD-MM-YYYY").toDate();
    const result = await leavesCollection.updateOne(
      {
        userId: user._id,
        leaveDate: leaveDate,
        type: "half-day-morning"
      },
      {
        $set: {
          status: "approved",
          approvalDate: new Date(),
          comments: "Approved by Administrator request",
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount > 0) {
      console.log(`[UPDATED] Successfully updated leave record to approved for MNCVV-97 (MUTHU KUMARI S) on 01-06-2026. Modified: ${result.modifiedCount}`);
    } else {
      console.log("[WARN] No matching leave record found to update.");
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

updateLeaveApproved();
