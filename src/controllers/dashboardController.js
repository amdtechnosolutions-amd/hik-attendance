import mongoose from 'mongoose';
import asyncHandler from "express-async-handler";
import moment from "moment-timezone";


/**
 * Get dashboard data for an institution
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */


// export async function getDashboardData(req, res) {
//   const { institutionId } = req.params;
//   const { date, period } = req.query;

//   try {
//     const { models } = req.institutionDb;

//     const today = date ? new Date(date) : new Date();
//     today.setHours(0, 0, 0, 0);

//     const tomorrow = new Date(today);
//     tomorrow.setDate(tomorrow.getDate() + 1);

//     let startDate, endDate;
//     const currentPeriod = period || 'month';

//     switch (currentPeriod) {
//       case 'day':
//         startDate = today;
//         endDate = tomorrow;
//         break;
//       case 'week':
//         startDate = new Date(today);
//         startDate.setDate(today.getDate() - today.getDay());
//         endDate = new Date(startDate);
//         endDate.setDate(startDate.getDate() + 7);
//         break;
//       case 'year':
//         startDate = new Date(today.getFullYear(), 0, 1);
//         endDate = new Date(today.getFullYear() + 1, 0, 1);
//         break;
//       default: // month
//         startDate = new Date(today.getFullYear(), today.getMonth(), 1);
//         endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
//         break;
//     }

//     // Counts
//     const totalUsers = await models.User.countDocuments({ institutionId });
//     const totalDevices = await models.Device.countDocuments({ institutionId });
//     console.log('====================================');
//     console.log(totalUsers, totalDevices);
//     console.log('====================================');
//     // Today's attendance
//     const todayAttendance = await models.Attendance.find({
//       institutionId,
//       timestamp: { $gte: today, $lt: tomorrow }
//     });
//     const user = await models.User.find({
//       institutionId,
//       // timestamp: { $gte: today, $lt: tomorrow }
//     });
//     console.log('====================================');
//     console.log(user);
//     console.log('====================================');
//     // Normalize employeeNos
//     const uniqueEmployeeNos = [...new Set(
//       todayAttendance
//         .map(r => r.employeeNo)
//         .filter(Boolean)
//         .map(no => no.trim().toUpperCase())
//     )];

//     // Function to get user details (by normalized employeeNo)
//     async function getUserDetails(empNos, fields = 'name employeeNo') {
//       if (!empNos.length) return [];
//       return models.User.find({
//         institutionId: new mongoose.Types.ObjectId(institutionId),
//         employeeNo: { $in: empNos }
//       }).select(fields);
//     }

//     // Present users
//     const presentUsersRaw = await getUserDetails(uniqueEmployeeNos, '_id name employeeNo');
//     const presentUsers = presentUsersRaw.map(u => ({
//       _id: u._id,
//       name: u.name,
//       employeeNo: (u.employeeNo || '').trim().toUpperCase()
//     }));

//     const presentCount = presentUsers.length;
//     const absentCount = Math.max(0, totalUsers - presentCount);

//     const attendancePercentage = totalUsers > 0
//       ? Math.round((presentCount / totalUsers) * 100)
//       : 0;

//     // Absent users list (limit 10)
//     const presentUserIds = presentUsers.map(u => u._id);
//     const absentUsersRaw = await models.User.find({
//       institutionId,
//       _id: { $nin: presentUserIds }
//     }).select('name employeeNo').limit(10);
//     const absentUsers = absentUsersRaw.map(u => ({
//       name: u.name,
//       employeeNo: (u.employeeNo || '').trim().toUpperCase()
//     }));

//     // Late threshold 9am
//     const lateThreshold = new Date(today);
//     lateThreshold.setHours(9, 0, 0, 0);

//     // First attendance entries per employee
//     const firstEntries = {};
//     todayAttendance.forEach(rec => {
//       const empNo = rec.employeeNo ? rec.employeeNo.trim().toUpperCase() : null;
//       if (!empNo) return;
//       if (!firstEntries[empNo] || rec.timestamp < firstEntries[empNo].timestamp) {
//         firstEntries[empNo] = { timestamp: rec.timestamp, employeeNo: empNo };
//       }
//     });

//     // Get late users details
//     const lateEmpNos = Object.keys(firstEntries);
//     const lateUsersRaw = await getUserDetails(lateEmpNos);
//     const lateUsersMap = {};
//     lateUsersRaw.forEach(u => {
//       lateUsersMap[u.employeeNo.trim().toUpperCase()] = { name: u.name, employeeNo: u.employeeNo.trim().toUpperCase() };
//     });

//     const lateComers = Object.values(firstEntries)
//       .filter(entry => entry.timestamp > lateThreshold)
//       .map(entry => {
//         const details = lateUsersMap[entry.employeeNo] || { name: `Employee ${entry.employeeNo}`, employeeNo: entry.employeeNo };
//         return { ...details, arrivalTime: entry.timestamp };
//       })
//       .slice(0, 10);

//     // Period attendance summary aggregation
//     const periodAttendance = await models.Attendance.aggregate([
//       {
//         $match: {
//           institutionId: new mongoose.Types.ObjectId(institutionId),
//           timestamp: { $gte: startDate, $lt: endDate }
//         }
//       },
//       {
//         $group: {
//           _id: {
//             day: { $dayOfMonth: "$timestamp" },
//             month: { $month: "$timestamp" },
//             year: { $year: "$timestamp" },
//             employeeNo: "$employeeNo"
//           },
//           firstEntry: { $min: '$timestamp' }
//         }
//       },
//       {
//         $group: {
//           _id: {
//             day: '$_id.day',
//             month: '$_id.month',
//             year: '$_id.year'
//           },
//           count: { $sum: 1 }
//         }
//       },
//       { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
//     ]);
//     const periodData = periodAttendance.map(item => ({
//       date: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`,
//       count: item.count,
//       percentage: totalUsers > 0 ? Math.round((item.count / totalUsers) * 100) : 0
//     }));

//     // Hourly attendance trend aggregation
//     const hourlyTrend = await models.Attendance.aggregate([
//       {
//         $match: {
//           institutionId: new mongoose.Types.ObjectId(institutionId),
//           timestamp: { $gte: startDate, $lt: endDate }
//         }
//       },
//       {
//         $group: {
//           _id: { hour: { $hour: '$timestamp' }, employeeNo: '$employeeNo' },
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $group: { _id: '$_id.hour', count: { $sum: 1 } }
//       },
//       { $sort: { _id: 1 } }
//     ]);
//     const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
//     hourlyTrend.forEach(item => {
//       if (item._id >= 0 && item._id < 24) hourlyData[item._id].count = item.count;
//     });

//     // Top 5 punctual users aggregation
//     const punctualAgg = await models.Attendance.aggregate([
//       {
//         $match: {
//           institutionId: new mongoose.Types.ObjectId(institutionId),
//           timestamp: { $gte: startDate, $lt: endDate },
//           employeeNo: { $ne: null, $ne: '' }
//         }
//       },
//       {
//         $group: {
//           _id: {
//             day: { $dayOfMonth: "$timestamp" },
//             month: { $month: "$timestamp" },
//             year: { $year: "$timestamp" },
//             employeeNo: "$employeeNo"
//           },
//           firstEntry: { $min: "$timestamp" }
//         }
//       },
//       {
//         $group: {
//           _id: "$_id.employeeNo",
//           averageArrivalTime: { $avg: { $hour: "$firstEntry" } },
//           averageArrivalMinute: { $avg: { $minute: "$firstEntry" } },
//           daysPresent: { $sum: 1 }
//         }
//       },
//       { $sort: { averageArrivalTime: 1, averageArrivalMinute: 1 } },
//       { $limit: 5 }
//     ]);
//     const punctualEmpNos = punctualAgg.map(u => (u._id || '').trim().toUpperCase()).filter(Boolean);
//     const punctualUsersRaw = await getUserDetails(punctualEmpNos);
//     const punctualUsersMap = {};
//     punctualUsersRaw.forEach(u => {
//       punctualUsersMap[u.employeeNo.trim().toUpperCase()] = { name: u.name, employeeNo: u.employeeNo.trim().toUpperCase() };
//     });
//     const topPunctualUsers = punctualAgg.map(u => {
//       const empNo = (u._id || '').trim().toUpperCase();
//       const details = punctualUsersMap[empNo] || { name: `Employee ${empNo}` };
//       const hours = Math.floor(u.averageArrivalTime || 0);
//       const mins = Math.floor(u.averageArrivalMinute || 0);
//       return {
//         name: details.name,
//         employeeNo: empNo,
//         averageArrivalTime: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
//         daysPresent: u.daysPresent
//       };
//     });

//     // Top 5 consistent users aggregation
//     const consistentAgg = await models.Attendance.aggregate([
//       {
//         $match: {
//           institutionId: new mongoose.Types.ObjectId(institutionId),
//           timestamp: { $gte: startDate, $lt: endDate },
//           employeeNo: { $ne: null, $ne: '' }
//         }
//       },
//       {
//         $group: {
//           _id: {
//             day: { $dayOfMonth: "$timestamp" },
//             month: { $month: "$timestamp" },
//             year: { $year: "$timestamp" },
//             employeeNo: "$employeeNo"
//           },
//           firstEntry: { $min: "$timestamp" }
//         }
//       },
//       {
//         $group: {
//           _id: "$_id.employeeNo",
//           daysPresent: { $sum: 1 }
//         }
//       },
//       { $sort: { daysPresent: -1 } },
//       { $limit: 5 }
//     ]);
//     const consistentEmpNos = consistentAgg.map(u => (u._id || '').trim().toUpperCase()).filter(Boolean);
//     const consistentUsersRaw = await getUserDetails(consistentEmpNos);
//     const consistentUsersMap = {};
//     consistentUsersRaw.forEach(u => {
//       consistentUsersMap[u.employeeNo.trim().toUpperCase()] = { name: u.name, employeeNo: u.employeeNo.trim().toUpperCase() };
//     });
//     const mostConsistentUsers = consistentAgg.map(u => {
//       const empNo = (u._id || '').trim().toUpperCase();
//       const details = consistentUsersMap[empNo] || { name: `Employee ${empNo}` };
//       return { name: details.name, employeeNo: empNo, daysPresent: u.daysPresent };
//     });

//     // Calculate total working days Mon-Fri
//     let workingDays = 0;
//     let curDate = new Date(startDate);
//     while (curDate < endDate) {
//       const day = curDate.getDay();
//       if (day !== 0 && day !== 6) workingDays++;
//       curDate.setDate(curDate.getDate() + 1);
//     }

//     res.json({
//       totalUsers,
//       totalDevices,
//       todaySummary: { date: today.toISOString().split('T')[0], presentCount, absentCount, attendancePercentage },
//       periodSummary: {
//         period: currentPeriod,
//         startDate: startDate.toISOString().split('T')[0],
//         endDate: new Date(endDate.getTime() - 1).toISOString().split('T')[0],
//         workingDays,
//         data: periodData
//       },
//       absentUsers,
//       lateComers,
//       hourlyTrend: hourlyData,
//       topPunctualUsers,
//       mostConsistentUsers
//     });

//   } catch (err) {
//     console.error('Error fetching dashboard data:', err);
//     res.status(500).json({ message: err.message });
//   }
// }




// Helper function to get start of day in specified timezone without external libs


// export async function getDashboardData(req, res) {
//   const { institutionId } = req.params;
//   const { date, period } = req.query;

//   try {
//     const { models } = req.institutionDb;
//     const timeZone = "Asia/Kolkata";

//     // ✅ Convert current UTC date to IST properly
//     const now = date ? new Date(date) : new Date();
//     const zonedNow = new Date(now.toLocaleString("en-US", { timeZone }));

//     // ✅ Start of day and next day (both in IST)
//     const zonedToday = new Date(zonedNow);
//     zonedToday.setHours(0, 0, 0, 0);

//     const tomorrow = new Date(zonedToday);
//     tomorrow.setDate(tomorrow.getDate() + 1);

//     // ✅ Determine the date range for the selected period
//     let startDate, endDate;
//     const currentPeriod = period || "month";

//     switch (currentPeriod) {
//       case "day":
//         startDate = new Date(zonedToday);
//         endDate = new Date(tomorrow);
//         break;
//       case "week":
//         startDate = new Date(zonedToday);
//         startDate.setDate(startDate.getDate() - startDate.getDay());
//         endDate = new Date(startDate);
//         endDate.setDate(startDate.getDate() + 7);
//         break;
//       case "year":
//         startDate = new Date(zonedToday.getFullYear(), 0, 1);
//         endDate = new Date(zonedToday.getFullYear() + 1, 0, 1);
//         break;
//       default: // month
//         startDate = new Date(zonedToday.getFullYear(), zonedToday.getMonth(), 1);
//         endDate = new Date(zonedToday.getFullYear(), zonedToday.getMonth() + 1, 1);
//         break;
//     }

//     const institutionObjId = new mongoose.Types.ObjectId(institutionId);

//     // ✅ Totals
//     const totalUsers = await models.User.countDocuments({ institutionId: institutionObjId });
//     const totalDevices = await models.Device.countDocuments({ institutionId: institutionObjId });

//     // ✅ Fetch today's attendance (IST)
//     const todayAttendance = await models.Attendance.find({
//       institutionId: institutionObjId,
//       timestamp: { $gte: zonedToday, $lt: tomorrow }
//     });

//     // ✅ Extract unique employee numbers
//     const uniqueEmployeeNos = [
//       ...new Set(
//         todayAttendance
//           .map(r => r.employeeNo)
//           .filter(Boolean)
//           .map(no => no.trim().toUpperCase())
//       ),
//     ];

//     async function getUserDetails(empNos, fields = "name employeeNo") {
//       if (!empNos.length) return [];
//       return models.User.find({
//         institutionId: institutionObjId,
//         employeeNo: { $in: empNos }
//       }).select(fields);
//     }

//     // ✅ Present users
//     const presentUsersRaw = await getUserDetails(uniqueEmployeeNos, "_id name employeeNo");
//     const presentUsers = presentUsersRaw.map(u => ({
//       _id: u._id,
//       name: u.name,
//       employeeNo: (u.employeeNo || "").trim().toUpperCase(),
//     }));

//     const presentCount = presentUsers.length;
//     const absentCount = Math.max(0, totalUsers - presentCount);

//     const attendancePercentage =
//       totalUsers > 0 ? Math.round((presentCount / totalUsers) * 100) : 0;

//     // ✅ Absentees
//     const presentUserIds = presentUsers.map(u => u._id);
//     const absentUsersRaw = await models.User.find({
//       institutionId: institutionObjId,
//       _id: { $nin: presentUserIds },
//     })
//       .select("name employeeNo")
//       .limit(10);

//     const absentUsers = absentUsersRaw.map(u => ({
//       name: u.name,
//       employeeNo: (u.employeeNo || "").trim().toUpperCase(),
//     }));

//     // ✅ Late comers (after 9:00 AM IST)
//     const lateThreshold = new Date(zonedToday);
//     lateThreshold.setHours(9, 0, 0, 0);

//     const firstEntries = {};
//     todayAttendance.forEach(rec => {
//       const empNo = rec.employeeNo ? rec.employeeNo.trim().toUpperCase() : null;
//       if (!empNo) return;
//       if (!firstEntries[empNo] || rec.timestamp < firstEntries[empNo].timestamp) {
//         firstEntries[empNo] = { timestamp: rec.timestamp, employeeNo: empNo };
//       }
//     });

//     const lateEmpNos = Object.keys(firstEntries);
//     const lateUsersRaw = await getUserDetails(lateEmpNos);
//     const lateUsersMap = {};
//     lateUsersRaw.forEach(u => {
//       lateUsersMap[u.employeeNo.trim().toUpperCase()] = {
//         name: u.name,
//         employeeNo: u.employeeNo.trim().toUpperCase(),
//       };
//     });

//     const lateComers = Object.values(firstEntries)
//       .filter(entry => entry.timestamp > lateThreshold)
//       .map(entry => {
//         const details =
//           lateUsersMap[entry.employeeNo] || {
//             name: `Employee ${entry.employeeNo}`,
//             employeeNo: entry.employeeNo,
//           };
//         return { ...details, arrivalTime: entry.timestamp };
//       })
//       .slice(0, 10);

//     // ✅ Attendance over period (for charts)
//     const periodAttendance = await models.Attendance.aggregate([
//       {
//         $match: {
//           institutionId: institutionObjId,
//           timestamp: { $gte: startDate, $lt: endDate },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             day: { $dayOfMonth: "$timestamp" },
//             month: { $month: "$timestamp" },
//             year: { $year: "$timestamp" },
//             employeeNo: "$employeeNo",
//           },
//           firstEntry: { $min: "$timestamp" },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             day: "$_id.day",
//             month: "$_id.month",
//             year: "$_id.year",
//           },
//           count: { $sum: 1 },
//         },
//       },
//       { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
//     ]);

//     const periodData = periodAttendance.map(item => ({
//       date: `${item._id.year}-${item._id.month
//         .toString()
//         .padStart(2, "0")}-${item._id.day.toString().padStart(2, "0")}`,
//       count: item.count,
//       percentage:
//         totalUsers > 0 ? Math.round((item.count / totalUsers) * 100) : 0,
//     }));

//     // ✅ Hourly trend data
//     const hourlyTrend = await models.Attendance.aggregate([
//       {
//         $match: {
//           institutionId: institutionObjId,
//           timestamp: { $gte: startDate, $lt: endDate },
//         },
//       },
//       {
//         $group: {
//           _id: { hour: { $hour: "$timestamp" }, employeeNo: "$employeeNo" },
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $group: { _id: "$_id.hour", count: { $sum: 1 } },
//       },
//       { $sort: { _id: 1 } },
//     ]);

//     const hourlyData = Array.from({ length: 24 }, (_, i) => ({
//       hour: i,
//       count: 0,
//     }));
//     hourlyTrend.forEach(item => {
//       if (item._id >= 0 && item._id < 24) hourlyData[item._id].count = item.count;
//     });

//     // ✅ Working days (Mon–Fri)
//     let workingDays = 0;
//     let curDate = new Date(startDate);
//     while (curDate < endDate) {
//       const day = curDate.getDay();
//       if (day !== 0 && day !== 6) workingDays++;
//       curDate.setDate(curDate.getDate() + 1);
//     }

//     // ✅ Response
//     res.json({
//       totalUsers,
//       totalDevices,
//       todaySummary: {
//         date: zonedToday.toISOString().split("T")[0],
//         presentCount,
//         absentCount,
//         attendancePercentage,
//       },
//       periodSummary: {
//         period: currentPeriod,
//         startDate: startDate.toISOString().split("T")[0],
//         endDate: new Date(endDate.getTime() - 1).toISOString().split("T")[0],
//         workingDays,
//         data: periodData,
//       },
//       absentUsers,
//       lateComers,
//       hourlyTrend: hourlyData,
//     });
//   } catch (err) {
//     console.error("Error fetching dashboard data:", err);
//     res.status(500).json({ message: err.message });
//   }
// }
export const getInstitutionDashboard = asyncHandler(async (req, res) => {
  const { institutionId } = req.params;
  const { date, period } = req.query;

  try {
    const { models } = req.institutionDb;
    const timeZone = "Asia/Kolkata";

    // ✅ Use provided date or fallback to today
    const now = date ? new Date(date) : new Date();
    const zonedNow = new Date(now.toLocaleString("en-US", { timeZone }));

    // ✅ Start and end of day in IST
    const zonedToday = new Date(zonedNow);
    zonedToday.setHours(0, 0, 0, 0);

    const tomorrow = new Date(zonedToday);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ✅ Determine start & end range for the selected period
    let startDate, endDate;
    const currentPeriod = period || "month";

    switch (currentPeriod) {
      case "day":
        startDate = new Date(zonedToday);
        endDate = new Date(tomorrow);
        break;
      case "week":
        startDate = new Date(zonedToday);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        break;
      case "year":
        startDate = new Date(zonedToday.getFullYear(), 0, 1);
        endDate = new Date(zonedToday.getFullYear() + 1, 0, 1);
        break;
      default: // month
        startDate = new Date(zonedToday.getFullYear(), zonedToday.getMonth(), 1);
        endDate = new Date(zonedToday.getFullYear(), zonedToday.getMonth() + 1, 1);
        break;
    }

    const institutionObjId = new mongoose.Types.ObjectId(institutionId);

    // ✅ Totals
    const totalUsers = await models.User.countDocuments({ institutionId: institutionObjId });
    const totalDevices = await models.Device.countDocuments({ institutionId: institutionObjId });

    // ✅ Attendance for selected date (IST)
    const todayAttendance = await models.Attendance.find({
      institutionId: institutionObjId,
      timestamp: { $gte: zonedToday, $lt: tomorrow },
    });

    // ✅ Unique employeeNos
    const uniqueEmployeeNos = [
      ...new Set(
        todayAttendance
          .map(r => r.employeeNo)
          .filter(Boolean)
          .map(no => no.trim().toUpperCase())
      ),
    ];

    async function getUserDetails(empNos, fields = "name employeeNo") {
      if (!empNos.length) return [];
      return models.User.find({
        institutionId: institutionObjId,
        employeeNo: { $in: empNos },
      }).select(fields);
    }

    // ✅ Present users
    const presentUsersRaw = await getUserDetails(uniqueEmployeeNos, "_id name employeeNo");
    const presentUsers = presentUsersRaw.map(u => ({
      _id: u._id,
      name: u.name,
      employeeNo: (u.employeeNo || "").trim().toUpperCase(),
    }));

    const presentCount = presentUsers.length;
    const absentCount = Math.max(0, totalUsers - presentCount);
    const attendancePercentage =
      totalUsers > 0 ? Math.round((presentCount / totalUsers) * 100) : 0;

    // ✅ Absentees
    const presentUserIds = presentUsers.map(u => u._id);
    const absentUsersRaw = await models.User.find({
      institutionId: institutionObjId,
      _id: { $nin: presentUserIds },
    })
      .select("name employeeNo seniorityNo")
      .sort({ seniorityNo: 1 }) // Sort by seniorityNo in ascending order
      .limit(50);

    const absentUsers = absentUsersRaw.map(u => ({
      name: u.name,
      employeeNo: (u.employeeNo || "").trim().toUpperCase(),
      seniorityNo: u.seniorityNo || 9999 // Include seniorityNo in the response, default to high number if not set
    }));

    // ✅ Late comers (after 9:01 AM)
    const lateThreshold = new Date(zonedToday);
    lateThreshold.setHours(9, 1, 0, 0); // Changed to 9:01 AM as per requirement

    const firstEntries = {};
    todayAttendance.forEach(rec => {
      const empNo = rec.employeeNo ? rec.employeeNo.trim().toUpperCase() : null;
      if (!empNo) return;
      if (!firstEntries[empNo] || rec.timestamp < firstEntries[empNo].timestamp) {
        firstEntries[empNo] = { timestamp: rec.timestamp, employeeNo: empNo };
      }
    });

    const lateEmpNos = Object.keys(firstEntries);
    const lateUsersRaw = await getUserDetails(lateEmpNos);
    const lateUsersMap = {};
    lateUsersRaw.forEach(u => {
      lateUsersMap[u.employeeNo.trim().toUpperCase()] = {
        name: u.name,
        employeeNo: u.employeeNo.trim().toUpperCase(),
      };
    });

    // If there are no attendance records for today, we'll still have an empty array
    // but we can add debug logging to help troubleshoot
    if (Object.keys(firstEntries).length === 0) {
      console.log("No attendance records found for today or no late comers detected");
    }

    // Process actual late comers from attendance data
    let lateComers = Object.values(firstEntries)
      .filter(entry => entry.timestamp > lateThreshold)
      .map(entry => {
        const details =
          lateUsersMap[entry.employeeNo] || {
            name: `Employee ${entry.employeeNo}`,
            employeeNo: entry.employeeNo,
          };
        
        // Calculate minutes late
        const minutesLate = Math.floor(
          (entry.timestamp - lateThreshold) / (1000 * 60)
        );
        
        return { 
          ...details, 
          arrivalTime: entry.timestamp,
          minutesLate: minutesLate
        };
      })
      .sort((a, b) => a.minutesLate - b.minutesLate) // Sort by minutes late
      .slice(0, 10);
      
    // If no late comers were found, just log it and keep the empty array
    if (lateComers.length === 0) {
      console.log("No late comers detected for today");
      // Return empty array instead of sample data
    }

    // ✅ Period attendance (chart data)
    const periodAttendance = await models.Attendance.aggregate([
      {
        $match: {
          institutionId: institutionObjId,
          timestamp: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$timestamp" },
            month: { $month: "$timestamp" },
            year: { $year: "$timestamp" },
            employeeNo: "$employeeNo",
          },
          firstEntry: { $min: "$timestamp" },
        },
      },
      {
        $group: {
          _id: {
            day: "$_id.day",
            month: "$_id.month",
            year: "$_id.year",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    const periodData = periodAttendance.map(item => ({
      date: `${item._id.year}-${item._id.month
        .toString()
        .padStart(2, "0")}-${item._id.day.toString().padStart(2, "0")}`,
      count: item.count,
      percentage: totalUsers > 0 ? Math.round((item.count / totalUsers) * 100) : 0,
    }));

    // ✅ Hourly trend
    const hourlyTrend = await models.Attendance.aggregate([
      {
        $match: {
          institutionId: institutionObjId,
          timestamp: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: { hour: { $hour: "$timestamp" }, employeeNo: "$employeeNo" },
          count: { $sum: 1 },
        },
      },
      {
        $group: { _id: "$_id.hour", count: { $sum: 1 } },
      },
      { $sort: { _id: 1 } },
    ]);

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0,
    }));
    hourlyTrend.forEach(item => {
      if (item._id >= 0 && item._id < 24) hourlyData[item._id].count = item.count;
    });

    // ✅ Working days
    let workingDays = 0;
    let curDate = new Date(startDate);
    while (curDate < endDate) {
      const day = curDate.getDay();
      if (day !== 0 && day !== 6) workingDays++;
      curDate.setDate(curDate.getDate() + 1);
    }

    // ✅ NEW: Fetch On Duty Records for today
    let onDutyUsers = [];
    try {
      // Get the OnDuty model
      const OnDuty = models.OnDuty;
      
      if (OnDuty) {
        // Convert zonedToday to moment for easier date comparison
        const todayMoment = moment(zonedToday).startOf('day');
        const tomorrowMoment = moment(tomorrow).startOf('day');
        
        console.log(`Fetching On Duty records for ${todayMoment.format('YYYY-MM-DD')}`);
        
        // Find on-duty records that overlap with today
        const onDutyRecords = await OnDuty.find({
          institutionId: institutionObjId,
          $and: [
            { startDate: { $lte: tomorrowMoment.toDate() } },
            { endDate: { $gte: todayMoment.toDate() } }
          ]
        }).lean();
        
        console.log(`Found ${onDutyRecords.length} on-duty records for today`);
        
        // Get user details for on-duty employees
        if (onDutyRecords.length > 0) {
          const onDutyEmpNos = onDutyRecords.map(record => record.employeeNo);
          const onDutyUsersRaw = await getUserDetails(onDutyEmpNos, '_id name employeeNo');
          
          // Create a map for quick lookup
          const onDutyUsersMap = {};
          onDutyUsersRaw.forEach(user => {
            onDutyUsersMap[user.employeeNo.trim().toUpperCase()] = user;
          });
          
          // Format on-duty records with user details
          onDutyUsers = onDutyRecords.map(record => {
            const user = onDutyUsersMap[record.employeeNo.trim().toUpperCase()] || {};
            return {
              name: user.name || `Employee ${record.employeeNo}`,
              employeeNo: record.employeeNo,
              description: record.description,
              startDate: moment(record.startDate).format('YYYY-MM-DD'),
              endDate: moment(record.endDate).format('YYYY-MM-DD')
            };
          });
        }
      }
    } catch (onDutyErr) {
      console.error('Error fetching On Duty records:', onDutyErr);
      // Continue without On Duty records if there's an error
    }

    // ✅ Final Response
    res.json({
      totalUsers,
      totalDevices,
      todaySummary: {
        date: now.toISOString().split("T")[0], // Use the actual date (today or provided date)
        presentCount,
        absentCount,
        attendancePercentage,
      },
      periodSummary: {
        period: currentPeriod,
        startDate: startDate.toISOString().split("T")[0],
        endDate: new Date(endDate.getTime() - 1).toISOString().split("T")[0],
        workingDays,
        data: periodData,
      },
      absentUsers,
      lateComers,
      hourlyTrend: hourlyData,
      onDutyUsers, // Added On Duty users for today
    });
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    res.status(500).json({ message: err.message });
  }
});
/**
 * Get detailed attendance statistics for a specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export async function getUserAttendanceStats(req, res) {
  const { institutionId, userId } = req.params;
  const { period } = req.query; // Optional period (day, week, month, year)

  try {
    const { models } = req.institutionDb;

    // Validate user exists
    const user = await models.User.findOne({
      _id: userId,
      institutionId
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set up date filters
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate date ranges based on period
    let startDate, endDate;
    const currentPeriod = period || 'month'; // Default to month if not specified

    switch (currentPeriod) {
      case 'day':
        startDate = today;
        endDate = new Date(today);
        endDate.setDate(today.getDate() + 1);
        break;
      case 'week':
        // Start from Sunday of the current week
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear() + 1, 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        break;
    }

    // Get all attendance records for this user in the period using employeeNo
    const attendanceRecords = await models.Attendance.find({
      institutionId,
      employeeNo: user.employeeNo,
      timestamp: { $gte: startDate, $lt: endDate }
    }).sort({ timestamp: 1 });

    // Group attendance by day
    const attendanceByDay = {};

    attendanceRecords.forEach(record => {
      const dateKey = record.timestamp.toISOString().split('T')[0];

      if (!attendanceByDay[dateKey]) {
        attendanceByDay[dateKey] = {
          date: dateKey,
          firstEntry: record.timestamp,
          lastExit: record.timestamp,
          entries: [record.timestamp]
        };
      } else {
        attendanceByDay[dateKey].entries.push(record.timestamp);

        // Update first entry and last exit
        if (record.timestamp < attendanceByDay[dateKey].firstEntry) {
          attendanceByDay[dateKey].firstEntry = record.timestamp;
        }
        if (record.timestamp > attendanceByDay[dateKey].lastExit) {
          attendanceByDay[dateKey].lastExit = record.timestamp;
        }
      }
    });

    // Calculate statistics
    const daysPresent = Object.keys(attendanceByDay).length;

    // Calculate total working days in the period
    let workingDays = 0;
    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
      // Count only weekdays (Monday to Friday)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate attendance percentage
    const attendancePercentage = workingDays > 0
      ? Math.round((daysPresent / workingDays) * 100)
      : 0;

    // Calculate average arrival time
    let totalArrivalMinutes = 0;
    const dailyAttendance = Object.values(attendanceByDay);

    dailyAttendance.forEach(day => {
      const arrivalHour = day.firstEntry.getHours();
      const arrivalMinute = day.firstEntry.getMinutes();
      totalArrivalMinutes += (arrivalHour * 60) + arrivalMinute;
    });

    const averageArrivalMinutes = daysPresent > 0
      ? Math.round(totalArrivalMinutes / daysPresent)
      : 0;

    const averageArrivalHour = Math.floor(averageArrivalMinutes / 60);
    const averageArrivalMinute = averageArrivalMinutes % 60;

    const formattedAverageArrival = `${averageArrivalHour.toString().padStart(2, '0')}:${averageArrivalMinute.toString().padStart(2, '0')}`;

    // Count late days (arrival after 9:00 AM)
    let lateDays = 0;
    dailyAttendance.forEach(day => {
      const arrivalHour = day.firstEntry.getHours();
      const arrivalMinute = day.firstEntry.getMinutes();

      if (arrivalHour > 9 || (arrivalHour === 9 && arrivalMinute > 0)) {
        lateDays++;
      }
    });

    // Format daily attendance for response
    const formattedDailyAttendance = dailyAttendance.map(day => {
      const firstEntryTime = new Date(day.firstEntry);
      const lastExitTime = new Date(day.lastExit);

      // Calculate duration in hours
      const durationMs = lastExitTime - firstEntryTime;
      const durationHours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal

      // Determine if late
      const arrivalHour = firstEntryTime.getHours();
      const arrivalMinute = firstEntryTime.getMinutes();
      const isLate = arrivalHour > 9 || (arrivalHour === 9 && arrivalMinute > 0);

      return {
        date: day.date,
        firstEntry: firstEntryTime.toISOString(),
        lastExit: lastExitTime.toISOString(),
        duration: durationHours,
        isLate,
        entryCount: day.entries.length
      };
    });

    // Return the user attendance statistics
    res.json({
      user: {
        id: user._id,
        name: user.name,
        employeeNo: user.employeeNo
      },
      periodSummary: {
        period: currentPeriod,
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date(endDate.getTime() - 1).toISOString().split('T')[0],
        workingDays,
        daysPresent,
        daysAbsent: workingDays - daysPresent,
        attendancePercentage,
        lateDays,
        averageArrivalTime: formattedAverageArrival
      },
      dailyAttendance: formattedDailyAttendance
    });

  } catch (err) {
    console.error('Error fetching user attendance statistics:', err);
    res.status(500).json({ message: err.message });
  }
}

export default { getUserAttendanceStats };