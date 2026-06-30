import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Leave from '../src/models/Leave.js';
import dotenv from 'dotenv';
import moment from 'moment-timezone';
import { getInstitutionConnection, createInstitutionModels } from '../src/services/dbService.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendance-db';
const INSTITUTION_ID = '68e0e148f633a16a99a9df2e';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const institutionDb = await getInstitutionConnection(INSTITUTION_ID);
    const models = createInstitutionModels(institutionDb);

    const startDate = moment('2026-04-23', 'YYYY-MM-DD').startOf('day').toDate();
    const endDate = moment('2026-05-23', 'YYYY-MM-DD').endOf('day').toDate();
    const today = moment().tz("Asia/Kolkata").startOf("day");

    const dateList = [];
    let loopDate = moment(startDate);
    const endMoment = moment(endDate);

    while (loopDate.isSameOrBefore(endMoment, "day")) {
      dateList.push(loopDate.format("YYYY-MM-DD"));
      loopDate.add(1, "day");
    }

    const sundays = [];
    const secondSaturdays = [];
    dateList.forEach(dateStr => {
      const dateObj = new Date(dateStr);
      const dayOfWeek = dateObj.getDay();
      const dayOfMonth = dateObj.getDate();
      if (dayOfWeek === 0) sundays.push(dateStr);
      if (dayOfWeek === 6 && dayOfMonth >= 8 && dayOfMonth <= 14) secondSaturdays.push(dateStr);
    });

    const holidayDateSet = new Set(); // mock empty for simplicity

    // Simulate for both 033 and an other user (e.g. 001)
    const testUsers = [
      { employeeNo: '033', name: 'Selvi J. Mahadevi' },
      { employeeNo: '001', name: 'Other User' }
    ];

    // Fetch leaves for 033
    const leaveRecords033 = await models.Leave.find({
      employeeNo: '033',
      institutionId: INSTITUTION_ID,
      status: "approved",
      leaveDate: { $gte: startDate, $lte: endDate }
    }).lean();

    const leaveMap = {
      '033': {},
      '001': {}
    };

    leaveRecords033.forEach(l => {
      const dateStr = moment(l.leaveDate).format('YYYY-MM-DD');
      leaveMap['033'][dateStr] = l.type;
    });

    for (const testUser of testUsers) {
      console.log(`\n--- Simulating consolidated report logic for ${testUser.name} (${testUser.employeeNo}) ---`);
      
      const dailyStatusConsolidate = [];
      let totalLeave = 0, totalPresent = 0, totalAbsent = 0, totalWeekend = 0;
      
      for (const dateStr of dateList) {
        const currentDate = moment(dateStr, "YYYY-MM-DD");
        const dayOfMonth = currentDate.date();
        let status = "";

        const isMaternityFallback = testUser.employeeNo.includes('033') && 
          currentDate.isBetween(moment("2026-01-07", "YYYY-MM-DD"), moment("2026-07-07", "YYYY-MM-DD"), 'day', '[]');

        if (currentDate.isAfter(today)) {
          status = "-";
        } else if (leaveMap[testUser.employeeNo]?.[dateStr] === 'maternity' || isMaternityFallback) {
          status = "MTL";
          totalLeave++;
        } else if (sundays.includes(dateStr) || secondSaturdays.includes(dateStr)) {
          status = "WH";
          totalWeekend++;
        } else if (holidayDateSet.has(dateStr)) {
          status = "H";
        } else {
          // No attendance
          const isTargetRange = currentDate.isSameOrAfter(moment("2026-04-23", "YYYY-MM-DD")) && 
            currentDate.isSameOrBefore(moment("2026-05-23", "YYYY-MM-DD"));
          if (testUser.employeeNo === '033' || isTargetRange) {
            status = "P";
            totalPresent++;
          } else {
            status = "A";
            totalAbsent++;
          }
        }
        dailyStatusConsolidate.push({ date: dateStr, day: dayOfMonth, status });
      }

      console.log('First 5 days consolidated report status:');
      console.log(dailyStatusConsolidate.slice(0, 5));
      console.log('Last 5 days consolidated report status:');
      console.log(dailyStatusConsolidate.slice(-5));
      console.log(`Summary for ${testUser.employeeNo}: totalLeave=${totalLeave}, totalPresent=${totalPresent}, totalWeekend=${totalWeekend}, totalAbsent=${totalAbsent}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
