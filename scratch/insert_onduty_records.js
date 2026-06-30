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

const odData = [
  { rawEmpId: "MNCVV-083", name: "DR.R.SASIKALA", date: "01-06-2026" },
  { rawEmpId: "MNCVV-083", name: "DR.R.SASIKALA", date: "02-06-2026" },
  { rawEmpId: "MNCVV-083", name: "DR.R.SASIKALA", date: "06-06-2026" },
  { rawEmpId: "MNCVV-083", name: "DR.R.SASIKALA", date: "08-06-2026" },
  { rawEmpId: "MNCVV-003", name: "SMT.T.P.LEELAVATHY", date: "16-06-2026" },
  { rawEmpId: "MNCVV-004", name: "SMT.D. NIRMALA", date: "09-06-2026" },
  { rawEmpId: "MNCVV-004", name: "SMT.D. NIRMALA", date: "16-06-2026" },
  { rawEmpId: "MNCVV-005", name: "SMT. THENMOZHI R", date: "17-06-2026" },
  { rawEmpId: "MNCVV-91",  name: "BANUMATHI S(BIO)", date: "01-06-2026" },
  { rawEmpId: "MNCVV-013", name: "SMT.SANKARI E", date: "01-06-2026" },
  { rawEmpId: "MNCVV-94",  name: "MURUGAN K", date: "16-06-2026" },
  { rawEmpId: "MNCVV-016", name: "SMT. A. BANUMATHY", date: "15-06-2026" },
  { rawEmpId: "MNCVV-021", name: "SRI M.KALIYAPERUMAL", date: "16-06-2026" },
  { rawEmpId: "MNCVV-024", name: "U. PRAVEENA", date: "08-06-2026" },
  { rawEmpId: "MNCVV-92",  name: "NIRMALA S", date: "02-06-2026" },
  { rawEmpId: "MNCVV-026", name: "SMT S. SANTHI", date: "15-06-2026" },
  { rawEmpId: "MNCVV-029", name: "SMT R.VANAJA", date: "02-06-2026" },
  { rawEmpId: "MNCVV-030", name: "SMT. N. MAHALAKSHMI", date: "02-06-2026" },
  { rawEmpId: "MNCVV-036", name: "SMT V. DEEPA", date: "10-06-2026" },
  { rawEmpId: "MNCVV-043", name: "SMT. S.MANJULA (SPL. EDUCATOR)", date: "09-06-2026" },
  { rawEmpId: "MNCVV-044", name: "SMT.V.MANJULA", date: "10-06-2026" },
  { rawEmpId: "MNCVV-044", name: "SMT.V.MANJULA", date: "11-06-2026" },
  { rawEmpId: "MNCVV-046", name: "SMT. A.VIMALA DEVI", date: "17-06-2026" },
  { rawEmpId: "MNCVV-047", name: "SMT. S.RATHINA", date: "10-06-2026" },
  { rawEmpId: "MNCVV-052", name: "SMT. J.NITHYA", date: "15-06-2026" },
  { rawEmpId: "MNCVV-055", name: "SMT. ANANDHA LAKSHMI", date: "17-06-2026" },
  { rawEmpId: "MNCVV-83",  name: "RANI CHANDHIKA K", date: "02-06-2026" },
  { rawEmpId: "MNCVV-109", name: "PARIMALA K", date: "17-06-2026" },
  { rawEmpId: "MNCVV-065", name: "SMT. C.KANCHANA", date: "16-06-2026" },
  { rawEmpId: "MNCVV-065", name: "SMT. C.KANCHANA", date: "17-06-2026" },
  { rawEmpId: "MNCVV-017", name: "C.ABINAYA", date: "19-06-2026" }
];

async function insertOnDutyRecords() {
  const client = new MongoClient(targetUri);
  try {
    await client.connect();
    console.log("Connected to ves_mncvv database");
    const db = client.db('ves_mncvv');
    const usersCollection = db.collection('users');
    const ondutyCollection = db.collection('onduties');

    // Fetch all unique employee numbers mapped
    const empIds = odData.map(d => d.rawEmpId.replace("MNCVV-", ""));
    const uniqueEmpIds = [...new Set(empIds)];

    const matchedUsers = await usersCollection.find({
      employeeNo: { $in: uniqueEmpIds }
    }).toArray();

    const matchedMap = new Map(matchedUsers.map(u => [u.employeeNo, u]));

    let insertedCount = 0;
    let skippedCount = 0;

    for (const record of odData) {
      const dbEmpNo = record.rawEmpId.replace("MNCVV-", "");
      const user = matchedMap.get(dbEmpNo);

      if (!user) {
        console.error(`[ERROR] User not found for employee ID: ${record.rawEmpId}`);
        continue;
      }

      // Parse dates consistently with Excel upload (moment to date)
      const startDate = moment(record.date, "DD-MM-YYYY").toDate();
      const endDate = moment(record.date, "DD-MM-YYYY").toDate();

      // Check if duplicate already exists
      const existing = await ondutyCollection.findOne({
        userId: user._id,
        startDate: startDate,
        endDate: endDate
      });

      if (existing) {
        console.log(`[SKIP] Already exists for ${record.rawEmpId} (${user.name}) on date ${record.date}`);
        skippedCount++;
        continue;
      }

      // Insert OnDuty record
      const result = await ondutyCollection.insertOne({
        institutionId: institutionId,
        userId: user._id,
        employeeNo: user.employeeNo,
        startDate: startDate,
        endDate: endDate,
        description: "On Duty",
        type: "full-day",
        session: "full",
        createdAt: new Date(),
        updatedAt: new Date()
      });

      if (result.acknowledged) {
        console.log(`[INSERTED] Row created for ${record.rawEmpId} (${user.name}) on date ${record.date}`);
        insertedCount++;
      } else {
        console.error(`[ERROR] Failed to insert record for ${record.rawEmpId} on date ${record.date}`);
      }
    }

    console.log(`\n--- Execution Summary ---`);
    console.log(`Total records processed: ${odData.length}`);
    console.log(`Successfully inserted:  ${insertedCount}`);
    console.log(`Skipped (duplicates):  ${skippedCount}`);

  } catch (err) {
    console.error("Migration Error:", err);
  } finally {
    await client.close();
  }
}

insertOnDutyRecords();
