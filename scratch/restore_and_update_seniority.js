import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import path from 'path';

dotenv.config();

const DB_NAME = 'ves_mncvv';
const INSTITUTION_ID = '68e0e148f633a16a99a9df2e';

let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
mongoUri = mongoUri.replace(/\/[^/?]+(\?|$)/, `/${DB_NAME}$1`);

async function run() {
  // 1. Read Excel data
  const excelFilePath = path.resolve('seniorityUpload.xlsx');
  console.log(`Reading Excel file: ${excelFilePath}`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelFilePath);
  const worksheet = workbook.worksheets[0];

  const excelMap = {};
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const employeeNo = String(row.getCell(1).value || '').trim();
    const seniorityNo = Number(row.getCell(2).value);
    const userType = String(row.getCell(3).value || '').trim();

    if (employeeNo) {
      excelMap[employeeNo] = { seniorityNo, userType };
    }
  });

  console.log(`Loaded ${Object.keys(excelMap).length} user configurations from Excel.`);

  // 2. Connect to DB
  console.log(`Connecting to database: ${DB_NAME}`);
  const conn = await mongoose.createConnection(mongoUri).asPromise();

  try {
    const UserSchema = new mongoose.Schema({
      institutionId: mongoose.Schema.Types.ObjectId,
      employeeNo: String,
      name: String,
      userType: String,
      seniorityNo: Number
    }, { strict: false });

    // Remove unique constraint temporarily in our mongoose model if needed, 
    // but the DB index unique constraint might still trigger. 
    // So we will perform updates in a safe order to avoid duplicate key errors.
    const User = conn.model('User', UserSchema, 'users');

    const users = await User.find({});
    console.log(`Found ${users.length} users in database.`);

    console.log('\n🔄 STEP 1: RESTORING USER TYPES & SENIORITY FROM EXCEL...');
    
    // Perform standard updates first (excluding 017 and 045)
    for (const u of users) {
      const empNo = u.employeeNo;
      if (empNo === '017' || empNo === '045') {
        continue; // Handle these separately later
      }

      const excelConfig = excelMap[empNo];
      if (excelConfig) {
        await User.updateOne(
          { _id: u._id },
          {
            userType: excelConfig.userType,
            seniorityNo: excelConfig.seniorityNo
          }
        );
      } else {
        console.log(`⚠️  User ${u.name} (${empNo}) not found in Excel config.`);
      }
    }
    console.log('✅ User types and standard seniority restored successfully.');

    console.log('\n🔄 STEP 2: SHIFTING SENIORITY NUMBERS >= 76 TO CREATE ROOM FOR NEW STAFF...');
    
    // Find all users with seniorityNo >= 76 and sort DESCENDING to prevent unique index collision
    const usersToShift = await User.find({
      seniorityNo: { $gte: 76 },
      employeeNo: { $nin: ['017', '045'] }
    }).sort({ seniorityNo: -1 });

    console.log(`Shifting ${usersToShift.length} users...`);
    for (const u of usersToShift) {
      const oldSeniority = u.seniorityNo;
      const newSeniority = oldSeniority + 2;
      
      await User.updateOne(
        { _id: u._id },
        { seniorityNo: newSeniority }
      );
      console.log(`  -> Shifted ${u.name} (${u.employeeNo}): Seniority ${oldSeniority} -> ${newSeniority}`);
    }
    console.log('✅ Shifting completed safely.');

    console.log('\n🔄 STEP 3: ASSIGNING SENIORITY TO NEW TEACHING STAFF...');
    
    // Abinaya (017) -> SeniorityNo: 75, userType: 'teaching'
    const abinayaUser = await User.findOne({ employeeNo: '017' });
    if (abinayaUser) {
      await User.updateOne(
        { _id: abinayaUser._id },
        {
          userType: 'teaching',
          seniorityNo: 75
        }
      );
      console.log(`✅ Assigned Smt C.Abinaya (017) -> SeniorityNo: 75, userType: 'teaching'`);
    } else {
      console.log('❌ Error: Abinaya (017) not found in DB!');
    }

    // Rekha (045) -> SeniorityNo: 76, userType: 'teaching'
    const rekhaUser = await User.findOne({ employeeNo: '045' });
    if (rekhaUser) {
      await User.updateOne(
        { _id: rekhaUser._id },
        {
          userType: 'teaching',
          seniorityNo: 76
        }
      );
      console.log(`✅ Assigned Smt. S..J.Rekha (045) -> SeniorityNo: 76, userType: 'teaching'`);
    } else {
      console.log('❌ Error: Rekha (045) not found in DB!');
    }

    console.log('\n🔍 STEP 4: VERIFYING FINAL STAFF SENIORITY ORDER...');
    const finalUsers = await User.find({}).sort({ seniorityNo: 1 });
    console.log('================================================================================');
    console.log('FINAL STAFF SENIORITY LIST:');
    console.log('================================================================================');
    finalUsers.forEach((u, idx) => {
      console.log(`${String(idx + 1).padStart(2, ' ')}. [${u.employeeNo}] - ${u.name.padEnd(30, ' ')} | Type: ${u.userType.padEnd(12, ' ')} | Seniority: ${u.seniorityNo}`);
    });
    console.log('================================================================================');

  } catch (err) {
    console.error('❌ Error during run:', err);
  } finally {
    await conn.close();
    console.log('Database connection closed.');
  }
}

run();
