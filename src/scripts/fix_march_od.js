import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment';

dotenv.config();

/**
 * Script to fix OD assignments for March 2026 based on image transcription.
 * Targets MNCVV institution.
 */

const institutionId = '68e0e148f633a16a99a9df2e'; // MNCVV
const description = 'Assigned based on March report image';
const dryRun = process.argv.includes('--dry-run');

const marchData = {
  'MNCVV-004': ['02', '06', '09', '11', '12', '13', '16'],
  'MNCVV-091': ['04', '05', '12'],
  'MNCVV-009': ['02', '04', '12'],
  'MNCVV-094': ['02', '04', '05'],
  'MNCVV-016': ['02'],
  'MNCVV-058': ['16'],
  'MNCVV-017': ['06', '09'],
  'MNCVV-021': ['09', '12', '13', '16'],
  'MNCVV-023': ['09'],
  'MNCVV-024': ['02', '04', '09', '11'],
  'MNCVV-025': ['02'],
  'MNCVV-092': ['02', '04', '05', '06', '09', '11'],
  'MNCVV-026': ['02', '04', '05', '06', '09', '11'],
  'MNCVV-028': ['02'],
  'MNCVV-029': ['02', '04', '05', '09', '11'],
  'MNCVV-030': ['04', '05', '09', '11'],
  'MNCVV-064': ['12', '13', '16'],
  'MNCVV-040': ['04', '05'],
  'MNCVV-053': ['02'],
  'MNCVV-055': ['09'],
  'MNCVV-083': ['02'],
  'MNCVV-097': ['12', '16'],
  'MNCVV-109': ['02', '06', '09'],
  'MNCVV-107': ['04', '05', '06'],
  'MNCVV-111': ['04', '05', '06'],
  'MNCVV-115': ['04', '05', '06'],
  'MNCVV-090': ['02'],
  'MNCVV-095': ['02', '06'],
  'MNCVV-065': ['04', '05', '06'],
  'MNCVV-121': ['02', '04', '12'],
  'MNCVV-073': ['04', '11']
};

async function fixMarchOD() {
  try {
    console.log(`🚀 Starting March OD Fix for Institution: ${institutionId}`);
    if (dryRun) console.log('🧪 DRY RUN MODE - No records will be created');

    await mongoose.connect(process.env.MONGO_URI);
    const mainDb = mongoose.connection.useDb('hik_attendance_milti');
    
    // 1. Get Institution Info
    const institution = await mainDb.collection('institutions').findOne({ _id: new mongoose.Types.ObjectId(institutionId) });
    if (!institution) throw new Error('Institution not found');
    console.log(`🏫 Institution: ${institution.name} (DB: ${institution.dbName})`);

    // 2. Connect to Tenant DB
    const tenantDbName = institution.dbName;
    const uriParts = process.env.MONGO_URI.split('?');
    const baseUrl = uriParts[0].replace(/\/[^/]*$/, `/${tenantDbName}`);
    const queryParams = uriParts.length > 1 ? `?${uriParts[1]}` : '';
    const tenantUri = `${baseUrl}${queryParams}`;
    const tenantConn = await mongoose.createConnection(tenantUri).asPromise();
    console.log(`🔗 Connected to Tenant DB: ${tenantDbName}`);

    const OnDuty = tenantConn.collection('onduties');
    const User = tenantConn.collection('users');

    let totalCreated = 0;
    let totalAlreadyExists = 0;
    let totalUsersNotFound = 0;

    for (const [rawEmployeeNo, days] of Object.entries(marchData)) {
      const numericPart = rawEmployeeNo.replace('MNCVV-', '');
      const rootPart = numericPart.replace(/^0+/, '');
      
      // Look up the user by trying different formats
      const user = await User.findOne({
        $or: [
          { employeeNo: numericPart },
          { employeeNo: rootPart },
          { employeeNo: rawEmployeeNo }
        ]
      });

      if (!user) {
        console.warn(`❌ User not found for ${rawEmployeeNo} (tried ${numericPart}, ${rootPart})`);
        totalUsersNotFound++;
        continue;
      }

      const employeeNo = user.employeeNo;
      console.log(`🔍 Processing User: ${user.name} (${employeeNo})`);

      for (const day of days) {
        const dateStr = `2026-03-${day.padStart(2, '0')}`;
        const currentDate = moment(dateStr, 'YYYY-MM-DD');

        // Check if OD already exists for this date
        const existingOD = await OnDuty.findOne({
          employeeNo,
          startDate: { $lte: currentDate.endOf('day').toDate() },
          endDate: { $gte: currentDate.startOf('day').toDate() }
        });

        if (existingOD) {
          console.log(`   ⚠️ OD already exists for ${dateStr}, skipping.`);
          totalAlreadyExists++;
          continue;
        }

        console.log(`   ✅ Marking OD for ${dateStr}`);
        if (!dryRun) {
          await OnDuty.insertOne({
            employeeNo,
            startDate: currentDate.startOf('day').toDate(),
            endDate: currentDate.endOf('day').toDate(),
            description,
            institutionId: new mongoose.Types.ObjectId(institutionId),
            createdAt: new Date()
          });
        }
        totalCreated++;
      }
    }

    console.log('\n✨ March OD Fix Completed');
    console.log(`📊 Total Records ${dryRun ? 'Identified' : 'Created'}: ${totalCreated}`);
    console.log(`📊 Records Already Existing: ${totalAlreadyExists}`);
    console.log(`📊 Users Not Found in DB: ${totalUsersNotFound}`);
    
    await tenantConn.close();
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error during March OD Fix:', err);
    process.exit(1);
  }
}

fixMarchOD();
