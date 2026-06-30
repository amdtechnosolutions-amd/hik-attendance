import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_NAME = 'ves_mncvv';
const targetEmployeeNos = ['045', '017'];
const targetUserIds = [
  new mongoose.Types.ObjectId('68df935de29a173206e204ca'), // Smt. K.Nalini (045)
  new mongoose.Types.ObjectId('68df935be29a173206e204b5')  // Smt K.Susitra (017)
];

let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
mongoUri = mongoUri.replace(/\/[^/?]+(\?|$)/, `/${DB_NAME}$1`);

async function run() {
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  console.log(`Connected to ${DB_NAME}`);

  try {
    const listCollections = await conn.db.listCollections().toArray();
    const collections = listCollections.map(c => c.name);

    console.log('\n--- SCANNING ALL COLLECTIONS FOR TARGET USER DATA SUMMARY ---');
    for (const collName of collections) {
      const Model = conn.model(collName, new mongoose.Schema({}, { strict: false }), collName);
      
      const countByEmpNo = await Model.countDocuments({
        employeeNo: { $in: targetEmployeeNos }
      });
      
      const countByUserId = await Model.countDocuments({
        userId: { $in: targetUserIds }
      });

      const countByUserField = await Model.countDocuments({
        user: { $in: targetUserIds }
      });

      const totalDocs = countByEmpNo + countByUserId + countByUserField;
      if (totalDocs > 0) {
        console.log(`Collection [${collName}]:`);
        console.log(`  - employeeNo matches: ${countByEmpNo}`);
        console.log(`  - userId matches:     ${countByUserId}`);
        console.log(`  - user matches:       ${countByUserField}`);
      }
    }

  } catch (err) {
    console.error('Error during run:', err);
  } finally {
    await conn.close();
    console.log('Connection closed');
  }
}

run();
