import mongoose from 'mongoose';
import dotenv from 'dotenv';
import moment from 'moment';

dotenv.config();

/**
 * Bulk Assign OD from Report logic
 * Targets a specific institution and date range.
 * For each faculty member, if they have no punch, no leave, and no existing OD on a working day,
 * create an OnDuty record.
 */

async function bulkAssignOD() {
  const institutionId = '68e0e148f633a16a99a9df2e'; // MNCVV
  const startDateStr = '2026-02-24';
  const endDateStr = '2026-03-24';
  const description = 'Assigned based on consolidated report';
  const dryRun = process.argv.includes('--dry-run');

  try {
    console.log(`🚀 Starting Bulk OD Assignment for Institution: ${institutionId}`);
    console.log(`📅 Period: ${startDateStr} to ${endDateStr}`);
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

    // Define Models manually for the script (since we are using raw connection)
    const User = tenantConn.collection('users');
    const Attendance = tenantConn.collection('attendances');
    const OnDuty = tenantConn.collection('onduties');

    // 3. Get all Faculty
    const users = await User.find({}).toArray();
    console.log(`👥 Found ${users.length} users`);

    const startDate = moment(startDateStr, 'YYYY-MM-DD');
    const endDate = moment(endDateStr, 'YYYY-MM-DD');
    const totalDays = endDate.diff(startDate, 'days') + 1;

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const user of users) {
      const employeeNo = user.employeeNo;
      console.log(`🔍 Processing User: ${user.name} (${employeeNo})`);

      for (let i = 0; i < totalDays; i++) {
        const currentDate = moment(startDate).add(i, 'days');
        const dateStr = currentDate.format('YYYY-MM-DD');
        const dayOfWeek = currentDate.day();

        // Skip Sundays (0) and 2nd Saturdays (if applicable, but let's be safe and check report logic)
        // From consolidatedReportController: 
        // if (dayOfWeek === 0) status = "WH";
        // if (dayOfWeek === 6 && d >= 8 && d <= 14) status = "WH";
        const isSunday = dayOfWeek === 0;
        const dayOfMonth = currentDate.date();
        const isSecondSaturday = dayOfWeek === 6 && dayOfMonth >= 8 && dayOfMonth <= 14;

        if (isSunday || isSecondSaturday) {
          continue;
        }

        // 4. Check if status is "Absent"
        // No Attendance
        const attCount = await Attendance.countDocuments({
          employeeNo,
          timestamp: {
            $gte: currentDate.startOf('day').toDate(),
            $lte: currentDate.endOf('day').toDate()
          }
        });

        if (attCount > 0) continue;

        // No Leave
        if (user.leaveDays && user.leaveDays.includes(dateStr)) continue;

        // No Existing OD
        const odCount = await OnDuty.countDocuments({
          employeeNo,
          $or: [
            { startDate: { $lte: currentDate.endOf('day').toDate() }, endDate: { $gte: currentDate.startOf('day').toDate() } }
          ]
        });

        if (odCount > 0) continue;

        // 5. Create OD Record
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

    console.log('\n✨ Bulk OD Assignment Completed');
    console.log(`📊 Total Records ${dryRun ? 'Identified' : 'Created'}: ${totalCreated}`);
    
    await tenantConn.close();
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error during Bulk OD Assignment:', err);
    process.exit(1);
  }
}

bulkAssignOD();
