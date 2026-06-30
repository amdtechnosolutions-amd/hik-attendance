import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_NAME = 'ves_mncvv';
const EMPLOYEE_NOS = []; // Empty array to prevent accidental runs
const TARGET_IDS = [];

let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
mongoUri = mongoUri.replace(/\/[^/?]+(\?|$)/, `/${DB_NAME}$1`);

async function run() {
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  console.log(`Connected to ${DB_NAME} to remove users.`);

  try {
    const listCollections = await conn.db.listCollections().toArray();
    const collections = listCollections.map(c => c.name);

    for (const collName of collections) {
      if (collName === 'system.profile') continue;
      
      const Model = conn.model(collName, new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, employeeNo: String, _id: mongoose.Schema.Types.ObjectId }, { strict: false }), collName);
      
      if (collName === 'users') {
        const result = await Model.deleteMany({ _id: { $in: TARGET_IDS } });
        console.log(`Deleted ${result.deletedCount} users from 'users' collection.`);
      } else {
        const resultUserId = await Model.deleteMany({ userId: { $in: TARGET_IDS } });
        const resultEmpNo = await Model.deleteMany({ employeeNo: { $in: EMPLOYEE_NOS } });
        
        let totalDeleted = resultUserId.deletedCount + resultEmpNo.deletedCount;
        if (totalDeleted > 0) {
          console.log(`Deleted ${totalDeleted} related records from '${collName}' collection.`);
        }
      }
    }
    
    console.log('Removal process completed safely.');
  } catch (err) {
    console.error('Error during removal:', err);
  } finally {
    await conn.close();
  }
}

run();
