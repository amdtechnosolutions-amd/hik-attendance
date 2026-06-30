import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://gba:gba7373@127.0.0.1:41111/hik_attendance_milti?authSource=admin';
const uriParts = MONGO_URI.split('?');
const baseUrl = uriParts[0];
const queryParams = uriParts.length > 1 ? `?${uriParts[1]}` : '';
const newBaseUrl = baseUrl.replace(/\/[^/]*$/, '/ves_mncvv');
const targetUri = `${newBaseUrl}${queryParams}`;

const checkUsers = [
  { rawEmpId: "MNCVV-070", name: "SMT. ANU K" },
  { rawEmpId: "MNCVV-97", name: "MUTHUKUMARI" }
];

async function verifyLeaveUsers() {
  const client = new MongoClient(targetUri);
  try {
    await client.connect();
    console.log("Connected to ves_mncvv database");
    const db = client.db('ves_mncvv');
    const usersCollection = db.collection('users');

    for (const item of checkUsers) {
      const strippedId = item.rawEmpId.replace("MNCVV-", "");
      // Try stripped ID
      let user = await usersCollection.findOne({ employeeNo: strippedId });
      if (!user) {
        // Try raw ID just in case
        user = await usersCollection.findOne({ employeeNo: item.rawEmpId });
      }

      if (user) {
        console.log(`[FOUND] ${item.rawEmpId} (${item.name}) -> DB Name: "${user.name}", DB employeeNo: "${user.employeeNo}", ID: ${user._id}`);
      } else {
        console.log(`[MISSING] ${item.rawEmpId} (${item.name})`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

verifyLeaveUsers();
