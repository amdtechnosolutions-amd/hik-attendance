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

const duplicatesToCheck = [
  { empId: "083", name: "Dr.R.Sasikala", date: "01-06-2026" },
  { empId: "91", name: "banumathi s(bio)", date: "01-06-2026" },
  { empId: "013", name: "Smt.Sankari  E", date: "01-06-2026" },
  { empId: "036", name: "Smt V. Deepa", date: "10-06-2026" },
  { empId: "044", name: "Smt. V.Manjula", date: "10-06-2026" },
  { empId: "047", name: "Smt. S.Rathina", date: "10-06-2026" }
];

async function getDuplicates() {
  const client = new MongoClient(targetUri);
  try {
    await client.connect();
    const db = client.db('ves_mncvv');
    const ondutyCollection = db.collection('onduties');

    const results = [];
    for (const dup of duplicatesToCheck) {
      const date = moment(dup.date, "DD-MM-YYYY").toDate();
      const record = await ondutyCollection.findOne({
        employeeNo: dup.empId,
        startDate: date
      });

      if (record) {
        results.push({
          employeeNo: `MNCVV-${dup.empId}`,
          name: dup.name,
          date: dup.date,
          dbId: record._id,
          description: record.description,
          type: record.type,
          session: record.session,
          createdAt: record.createdAt
        });
      }
    }

    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

getDuplicates();
