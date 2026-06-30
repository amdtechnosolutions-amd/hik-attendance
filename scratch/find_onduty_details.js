import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_NAME = 'ves_mncvv';
const targetEmployeeNos = ['045', '017'];
const targetUserIds = [
  new mongoose.Types.ObjectId('68df935de29a173206e204ca'),
  new mongoose.Types.ObjectId('68df935be29a173206e204b5')
];

let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
mongoUri = mongoUri.replace(/\/[^/?]+(\?|$)/, `/${DB_NAME}$1`);

async function run() {
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  try {
    const Onduty = conn.model('onduty', new mongoose.Schema({}, { strict: false }), 'onduties');
    const Permission = conn.model('permission', new mongoose.Schema({}, { strict: false }), 'permissions');

    const onduties = await Onduty.find({
      $or: [
        { employeeNo: { $in: targetEmployeeNos } },
        { userId: { $in: targetUserIds } }
      ]
    });
    console.log('--- ONDUTIES ---');
    for (const od of onduties) {
      console.log(JSON.stringify(od, null, 2));
    }

    const permissions = await Permission.find({
      $or: [
        { employeeNo: { $in: targetEmployeeNos } },
        { userId: { $in: targetUserIds } }
      ]
    });
    console.log('--- PERMISSIONS ---');
    for (const p of permissions) {
      console.log(JSON.stringify(p, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await conn.close();
  }
}

run();
