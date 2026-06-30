import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://gba:gba7373@127.0.0.1:41111/hik_attendance_milti?authSource=admin';
const uriParts = MONGO_URI.split('?');
const baseUrl = uriParts[0];
const queryParams = uriParts.length > 1 ? `?${uriParts[1]}` : '';
const newBaseUrl = baseUrl.replace(/\/[^/]*$/, '/ves_mncvv');
const targetUri = `${newBaseUrl}${queryParams}`;

// Employee ID, Staff Name, ONDUTY Date
const odData = [
  { rawEmpId: "MNCVV-083", name: "DR.R.SASIKALA", date: "2026-06-01" },
  { rawEmpId: "MNCVV-083", name: "DR.R.SASIKALA", date: "2026-06-02" },
  { rawEmpId: "MNCVV-083", name: "DR.R.SASIKALA", date: "2026-06-06" },
  { rawEmpId: "MNCVV-083", name: "DR.R.SASIKALA", date: "2026-06-08" },
  { rawEmpId: "MNCVV-003", name: "SMT.T.P.LEELAVATHY", date: "2026-06-16" },
  { rawEmpId: "MNCVV-004", name: "SMT.D. NIRMALA", date: "2026-06-09" },
  { rawEmpId: "MNCVV-004", name: "SMT.D. NIRMALA", date: "2026-06-16" },
  { rawEmpId: "MNCVV-005", name: "SMT. THENMOZHI R", date: "2026-06-17" },
  { rawEmpId: "MNCVV-91",  name: "BANUMATHI S(BIO)", date: "2026-06-01" },
  { rawEmpId: "MNCVV-013", name: "SMT.SANKARI E", date: "2026-06-01" },
  { rawEmpId: "MNCVV-94",  name: "MURUGAN K", date: "2026-06-16" },
  { rawEmpId: "MNCVV-016", name: "SMT. A. BANUMATHY", date: "2026-06-15" },
  { rawEmpId: "MNCVV-021", name: "SRI M.KALIYAPERUMAL", date: "2026-06-16" },
  { rawEmpId: "MNCVV-024", name: "U. PRAVEENA", date: "2026-06-08" },
  { rawEmpId: "MNCVV-92",  name: "NIRMALA S", date: "2026-06-02" },
  { rawEmpId: "MNCVV-026", name: "SMT S. SANTHI", date: "2026-06-15" },
  { rawEmpId: "MNCVV-029", name: "SMT R.VANAJA", date: "2026-06-02" },
  { rawEmpId: "MNCVV-030", name: "SMT. N. MAHALAKSHMI", date: "2026-06-02" },
  { rawEmpId: "MNCVV-036", name: "SMT V. DEEPA", date: "2026-06-10" },
  { rawEmpId: "MNCVV-043", name: "SMT. S.MANJULA (SPL. EDUCATOR)", date: "2026-06-09" },
  { rawEmpId: "MNCVV-044", name: "SMT.V.MANJULA", date: "2026-06-10" },
  { rawEmpId: "MNCVV-044", name: "SMT.V.MANJULA", date: "2026-06-11" },
  { rawEmpId: "MNCVV-046", name: "SMT. A.VIMALA DEVI", date: "2026-06-17" },
  { rawEmpId: "MNCVV-047", name: "SMT. S.RATHINA", date: "2026-06-10" },
  { rawEmpId: "MNCVV-052", name: "SMT. J.NITHYA", date: "2026-06-15" },
  { rawEmpId: "MNCVV-055", name: "SMT. ANANDHA LAKSHMI", date: "2026-06-17" },
  { rawEmpId: "MNCVV-83",  name: "RANI CHANDHIKA K", date: "2026-06-02" },
  { rawEmpId: "MNCVV-109", name: "PARIMALA K", date: "2026-06-17" },
  { rawEmpId: "MNCVV-065", name: "SMT. C.KANCHANA", date: "2026-06-16" },
  { rawEmpId: "MNCVV-065", name: "SMT. C.KANCHANA", date: "2026-06-17" },
  { rawEmpId: "MNCVV-017", name: "C.ABINAYA", date: "2026-06-19" }
];

async function verifyUsers() {
  const client = new MongoClient(targetUri);
  try {
    await client.connect();
    console.log("Connected to ves_mncvv database");
    const db = client.db('ves_mncvv');
    const usersCollection = db.collection('users');

    // Map rawEmpId to standard DB employeeNo (e.g. MNCVV-083 -> 083)
    const empIds = odData.map(d => d.rawEmpId.replace("MNCVV-", ""));
    const uniqueEmpIds = [...new Set(empIds)];

    const matchedUsers = await usersCollection.find({
      employeeNo: { $in: uniqueEmpIds }
    }).toArray();

    const matchedMap = new Map(matchedUsers.map(u => [u.employeeNo, u]));
    let allFound = true;

    console.log("\n--- Verification Results ---");
    odData.forEach((row, i) => {
      const dbEmpNo = row.rawEmpId.replace("MNCVV-", "");
      const user = matchedMap.get(dbEmpNo);
      if (user) {
        console.log(`[FOUND]  Row ${i+1}: ${row.rawEmpId} (${row.name}) -> DB Name: "${user.name}", DB EmpNo: "${user.employeeNo}", User ID: ${user._id}`);
      } else {
        console.log(`[MISSING] Row ${i+1}: ${row.rawEmpId} (${row.name}) -> DB EmpNo: "${dbEmpNo}" not found`);
        allFound = false;
      }
    });

    console.log(`\nVerification Status: ${allFound ? "SUCCESS - All users found" : "FAILED - Some users missing"}`);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}

verifyUsers();
