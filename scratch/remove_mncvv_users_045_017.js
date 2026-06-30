import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_NAME = 'ves_mncvv';
const CONFIRM_FLAG = process.argv.includes('--confirm');

const USERS = [
  {
    employeeNo: '017',
    _id: new mongoose.Types.ObjectId('68df935be29a173206e204b5'),
    name: 'Smt K.Susitra'
  },
  {
    employeeNo: '045',
    _id: new mongoose.Types.ObjectId('68df935de29a173206e204ca'),
    name: 'Smt. K.Nalini'
  }
];

const targetEmployeeNos = USERS.map(u => u.employeeNo);
const targetUserIds = USERS.map(u => u._id);

let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
mongoUri = mongoUri.replace(/\/[^/?]+(\?|$)/, `/${DB_NAME}$1`);

async function run() {
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  console.log(`Connected to database: ${DB_NAME}`);

  try {
    const listCollections = await conn.db.listCollections().toArray();
    const collections = listCollections.map(c => c.name).filter(c => c !== 'system.profile');

    console.log('\n================================================================================');
    console.log('🔍 PHASE 1: DRY RUN / RECORD SCAN');
    console.log('================================================================================');

    const scanResults = {};
    for (const collName of collections) {
      const Model = conn.model(collName, new mongoose.Schema({}, { strict: false }), collName);
      scanResults[collName] = { byUser: {} };

      for (const user of USERS) {
        let count = 0;
        if (collName === 'users') {
          count = await Model.countDocuments({ _id: user._id });
        } else {
          // Count by employeeNo OR userId OR user
          count = await Model.countDocuments({
            $or: [
              { employeeNo: user.employeeNo },
              { userId: user._id },
              { user: user._id }
            ]
          });
        }
        scanResults[collName].byUser[user.employeeNo] = count;
      }
    }

    // Print summary
    for (const user of USERS) {
      console.log(`\n👤 User: ${user.name} (Employee No: ${user.employeeNo}, ID: ${user._id})`);
      console.log('━'.repeat(60));
      let userTotal = 0;
      for (const collName of collections) {
        const count = scanResults[collName].byUser[user.employeeNo];
        if (count > 0) {
          console.log(`  - Collection [${collName}]: ${count} records`);
          userTotal += count;
        }
      }
      console.log(`  Total records to delete: ${userTotal}`);
    }

    if (!CONFIRM_FLAG) {
      console.log('\n================================================================================');
      console.log('⚠️  DRY RUN COMPLETED. NO WRITES PERFORMED.');
      console.log('👉 To execute the deletion, run:');
      console.log('   node scratch/remove_mncvv_users_045_017.js --confirm');
      console.log('================================================================================\n');
      return;
    }

    console.log('\n================================================================================');
    console.log('🔄 PHASE 2: DELETING RECORDS');
    console.log('================================================================================');

    for (const collName of collections) {
      const Model = conn.model(collName, new mongoose.Schema({}, { strict: false }), collName);
      
      if (collName === 'users') {
        const result = await Model.deleteMany({ _id: { $in: targetUserIds } });
        console.log(`🗑️  Deleted ${result.deletedCount} users from 'users' collection.`);
      } else {
        const result = await Model.deleteMany({
          $or: [
            { employeeNo: { $in: targetEmployeeNos } },
            { userId: { $in: targetUserIds } },
            { user: { $in: targetUserIds } }
          ]
        });
        if (result.deletedCount > 0) {
          console.log(`🗑️  Deleted ${result.deletedCount} records from '${collName}' collection.`);
        }
      }
    }

    console.log('\n================================================================================');
    console.log('🔍 PHASE 3: VERIFICATION POST-DELETION');
    console.log('================================================================================');

    let totalRemaining = 0;
    for (const collName of collections) {
      const Model = conn.model(collName, new mongoose.Schema({}, { strict: false }), collName);
      let count = 0;

      if (collName === 'users') {
        count = await Model.countDocuments({ _id: { $in: targetUserIds } });
      } else {
        count = await Model.countDocuments({
          $or: [
            { employeeNo: { $in: targetEmployeeNos } },
            { userId: { $in: targetUserIds } },
            { user: { $in: targetUserIds } }
          ]
        });
      }

      if (count > 0) {
        console.log(`❌ WARNING: ${count} records still remaining in '${collName}' collection.`);
        totalRemaining += count;
      }
    }

    if (totalRemaining === 0) {
      console.log('✅ Success! All matching user and related database records have been completely and securely removed.');
    } else {
      console.log(`⚠️  Warning: ${totalRemaining} records could not be fully deleted. Please inspect manually.`);
    }
    console.log('================================================================================\n');

  } catch (err) {
    console.error('❌ Error during execution:', err);
  } finally {
    await conn.close();
    console.log('Database connection closed.');
  }
}

run();
