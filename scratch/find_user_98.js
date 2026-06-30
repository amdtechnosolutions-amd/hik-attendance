import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_NAME = 'ves_mncvv';
let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
mongoUri = mongoUri.replace(/\/[^/?]+(\?|$)/, `/${DB_NAME}$1`);

async function run() {
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  console.log(`Connected to ${DB_NAME}`);

  try {
    const listCollections = await conn.db.listCollections().toArray();
    const collections = listCollections.map(c => c.name);

    const User = conn.model('User', new mongoose.Schema({ employeeNo: String, name: String }, { strict: false }));
    
    // Find users matching "98" or "098"
    const users = await User.find({
      $or: [
        { employeeNo: '098' },
        { employeeNo: '98' },
        { employeeNo: /98/ }
      ]
    }).lean();

    if (users.length === 0) {
      console.log('No users matching "98" or "098" found in the database.');
      return;
    }

    console.log(`Found ${users.length} matching user(s):`);
    for (const u of users) {
      console.log(`\n=== User Info ===`);
      console.log(`ID: ${u._id}`);
      console.log(`Employee No: ${u.employeeNo}`);
      console.log(`Name: ${u.name}`);
      console.log(`User Type: ${u.userType}`);
      console.log(`Seniority No: ${u.seniorityNo}`);
      
      const userIds = [u._id];
      const employeeNos = [u.employeeNo];

      console.log(`--- Associated Records ---`);
      for (const collName of collections) {
        if (collName === 'users' || collName === 'system.profile') continue;
        
        // Define dynamic schema to query
        const Model = conn.model(
          collName + '_check', 
          new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, employeeNo: String }, { strict: false }), 
          collName
        );
        
        const countByUserId = await Model.countDocuments({ userId: u._id });
        const countByEmpNo = await Model.countDocuments({ employeeNo: u.employeeNo });
        const count = countByUserId + countByEmpNo;
        
        if (count > 0) {
          console.log(` * ${collName}: ${countByUserId} by userId, ${countByEmpNo} by employeeNo`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.close();
  }
}

run();
