import cron from 'node-cron';
import { getInstitutionConnection, createInstitutionModels } from './dbService.js';
import Institution from '../models/Institution.js';
import { sendDailyAttendanceReport } from './emailService.js';
import { calculateAttendanceStatus, createAttendancePDF } from './reportService.js';
import { processSyncJob } from './syncJobService.js';
import fs from 'fs';
import path from 'path';
import moment from 'moment';

let scheduledTask = null;

export function startDailyReportScheduler() {
  if (process.env.SEND_DAILY_REPORTS !== 'true') {
    console.log('Daily report scheduler disabled (SEND_DAILY_REPORTS not set to true)');
    return;
  }

  const reportTime = process.env.DAILY_REPORT_TIME || '09:35';
  const [hour, minute] = reportTime.split(':').map(Number);

  const cronExpression = `${minute} ${hour} * * *`;
  console.log(`Starting daily report scheduler at ${reportTime} (${cronExpression})`);

  scheduledTask = cron.schedule(cronExpression, async () => {
    console.log(`[${new Date().toISOString()}] Running daily attendance report task...`);
    try {
      await sendDailyReportsForAllInstitutions();
    } catch (error) {
      console.error('Error in daily report scheduler:', error);
    }
  });
}

export function stopDailyReportScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask.destroy();
    console.log('Daily report scheduler stopped');
  }
}

async function sendDailyReportsForAllInstitutions() {
  try {
    const institutions = await Institution.find({ active: true }).lean();
    console.log(`Found ${institutions.length} active institutions`);

    for (const institution of institutions) {
      try {
        await sendDailyReportForInstitution(institution);
      } catch (err) {
        console.error(`Error sending report for institution ${institution._id}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Error fetching institutions:', error);
  }
}

async function sendDailyReportForInstitution(institution) {
  try {
    const institutionId = institution._id.toString();
    const conn = await getInstitutionConnection(institutionId);
    const models = createInstitutionModels(conn);

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    let users = await models.User.find().sort({ seniorityNo: 1 }).lean();

    if (!users || users.length === 0) {
      console.log(`No users found for institution ${institutionId}`);
      return;
    }

    // --- TRIGGER DEVICE SYNC ---
    try {
      const devices = await models.Device.find({ institutionId });
      console.log(`[Scheduler] Syncing ${devices.length} devices for ${institution.name}...`);
      
      for (const device of devices) {
        try {
          const startTime = moment().startOf('day').format('YYYY-MM-DDTHH:mm:ss');
          const endTime = moment().format('YYYY-MM-DDTHH:mm:ss');
          
          const job = await models.SyncJob.create({
            institutionId,
            deviceId: device._id,
            startTime,
            endTime,
            status: 'pending',
            createdAt: new Date()
          });
          
          await processSyncJob(job, models);
        } catch (syncErr) {
          console.error(`[Scheduler] Sync failed for device ${device._id}:`, syncErr.message);
        }
      }
    } catch (err) {
      console.error(`[Scheduler] Error in sync process for ${institution.name}:`, err.message);
    }

    // --- FETCH ATTENDANCE/LEAVE/ONDUTY DATA ---
    const attendanceData = await models.Attendance.aggregate([
      {
        $match: {
          timestamp: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: "$employeeNo",
          firstCheckIn: { $min: "$timestamp" },
          lastCheckOut: { $max: "$timestamp" }
        }
      }
    ]);
    const attendanceMap = {};
    attendanceData.forEach(att => attendanceMap[att._id] = att);

    const onDutyRecords = await models.OnDuty.find({
      institutionId,
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay }
    }).lean();
    const onDutyMap = {};
    onDutyRecords.forEach(od => onDutyMap[od.employeeNo] = true);

    const leaveRecords = await models.Leave.find({
      institutionId,
      status: "approved",
      leaveDate: { $gte: startOfDay, $lte: endOfDay }
    }).lean();
    const leaveMap = {};
    leaveRecords.forEach(l => leaveMap[l.employeeNo] = l.type);

    // Map data to users
    users = users.map(user => {
      const att = attendanceMap[user.employeeNo];
      const isOnDuty = !!onDutyMap[user.employeeNo];
      let status = "A";
      let firstCheckIn = null, lastCheckOut = null;

      if (isOnDuty) {
        status = "OD";
      } else if (leaveMap[user.employeeNo]) {
        status = (leaveMap[user.employeeNo] === 'maternity') ? "MTL" : "L";
      } else if (att) {
        firstCheckIn = att.firstCheckIn;
        lastCheckOut = att.lastCheckOut;
        // Simple late check (can be refined if needed, but keeping it simple for scheduler for now)
        const lateAfter = moment(`${moment(today).format("YYYY-MM-DD")} 09:30`, "YYYY-MM-DD HH:mm").toDate();
        if (firstCheckIn > lateAfter) status = "L";
        else status = "P";
      }

      return {
        ...user,
        firstCheckIn,
        lastCheckOut,
        status,
        onDuty: isOnDuty
      };
    });

    const reportFiles = await generateAttendanceReports(users, institution, models, institutionId);

    if (!institution.organizationEmail) {
      console.log(`No email configured for institution ${institutionId}`);
      return;
    }

    await sendDailyAttendanceReport(
      institution.organizationEmail,
      institution.name,
      reportFiles
    );

    console.log(`Successfully sent daily report for ${institution.name} to ${institution.organizationEmail}`);
  } catch (error) {
    console.error(`Error in sendDailyReportForInstitution:`, error);
    throw error;
  }
}

async function generateAttendanceReports(users, institution, models, institutionId) {
  const formattedDate = moment().format('YYYY-MM-DD');
  const reportsDir = path.join(process.cwd(), 'public', 'reports');

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // Determine if it's before 1 PM (hide checkout)
  const now = moment();
  const shouldHideCheckout = now.hour() < 13;

  // Calculate status for all users
  const { lateUsers, absentees } = calculateAttendanceStatus(users, new Date(), shouldHideCheckout);

  const reportFiles = {
    attendancePDF: null,
    latePDF: null,
    absentPDF: null
  };

  try {
    // 1. Main Attendance Report
    reportFiles.attendancePDF = await createAttendancePDF(users, `${institution.name} - Attendance Report`, `attendance_${institutionId}_${formattedDate}.pdf`, reportsDir, formattedDate, institution, shouldHideCheckout, true);

    // 2. Late Employees Report
    const filteredLateUsers = lateUsers.filter(u => !u.onDuty);
    if (filteredLateUsers.length > 0) {
      reportFiles.latePDF = await createAttendancePDF(filteredLateUsers, `${institution.name} - Late Employees`, `late_${institutionId}_${formattedDate}.pdf`, reportsDir, formattedDate, institution, shouldHideCheckout, false);
    }

    // 3. Absentees Report
    const filteredAbsentees = absentees.filter(u => !u.onDuty);
    if (filteredAbsentees.length > 0) {
      reportFiles.absentPDF = await createAttendancePDF(filteredAbsentees, `${institution.name} - Absentees`, `absent_${institutionId}_${formattedDate}.pdf`, reportsDir, formattedDate, institution, shouldHideCheckout, false);
    }

    return reportFiles;
  } catch (error) {
    console.error('Error generating reports:', error);
    throw error;
  }
}
