import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_NAME = 'ves_mncvv';
const targetEmployeeNos = ['045', '017'];

let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
mongoUri = mongoUri.replace(/\/[^/?]+(\?|$)/, `/${DB_NAME}$1`);

async function run() {
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  console.log(`Connected to ${DB_NAME}`);

  try {
    const listCollections = await conn.db.listCollections().toArray();
    const collections = listCollections.map(c => c.name);
    console.log('Collections in database:', collections);

    // Let's first search in users collection
    const UserSchema = new mongoose.Schema({}, { strict: false });
    const User = conn.model('User', UserSchema, 'users');
    
    const users = await User.find({
      employeeNo: { $in: targetEmployeeNos }
    });

    console.log(`Found ${users.length} users with employeeNo in ${JSON.stringify(targetEmployeeNos)}:`);
    const userIds = [];
    for (const u of users) {
      console.log(`- ID: ${u._id}, employeeNo: ${u.employeeNo}, name: ${u.name}, userType: ${u.userType}`);
      userIds.push(u._id);
    }

    // Now scan every collection for references
    console.log('\n--- SCANNING ALL COLLECTIONS FOR TARGET USER DATA ---');
    for (const collName of collections) {
      // Create a temporary model to query
      const Model = conn.model(collName, new mongoose.Schema({}, { strict: false }), collName);
      
      // Let's count by employeeNo
      const countByEmpNo = await Model.countDocuments({
        employeeNo: { $in: targetEmployeeNos }
      });
      
      // Let's count by userId
      let countByUserId = 0;
      if (userIds.length > 0) {
        countByUserId = await Model.countDocuments({
          userId: { $in: userIds }
        });
      }

      // Check if there are other potential fields like user or employee
      const countByUserField = userIds.length > 0 ? await Model.countDocuments({
        user: { $in: userIds }
      }) : 0;

      const totalDocs = countByEmpNo + countByUserId + countByUserField;
      if (totalDocs > 0) {
        console.log(`Collection [${collName}]:`);
        console.log(`  - records with employeeNo matching target: ${countByEmpNo}`);
        console.log(`  - records with userId matching target: ${countByUserId}`);
        console.log(`  - records with user matching target: ${countByUserField}`);
        
        // Let's fetch some sample/all records to see what fields they have
        const records = await Model.find({
          $or: [
            { employeeNo: { $in: targetEmployeeNos } },
            ...(userIds.length > 0 ? [{ userId: { $in: userIds } }, { user: { $in: userIds } }] : [])
          ]
        });
        
        for (const record of records) {
          const simplified = { ...record.toObject() };
          // omit large fields like face templates if any
          delete simplified.faceTemplate;
          delete simplified.faceImageData;
          console.log(`    Detail:`, JSON.stringify(simplified, null, 2));
        }
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
