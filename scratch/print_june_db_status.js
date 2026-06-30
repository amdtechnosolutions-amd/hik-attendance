import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import moment from 'moment-timezone';
import fs from 'fs';
dotenv.config({ path: '../.env' });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://gba:gba7373@127.0.0.1:41111/hik_attendance_milti?authSource=admin';
const uriParts = MONGO_URI.split('?');
const baseUrl = uriParts[0];
const queryParams = uriParts.length > 1 ? `?${uriParts[1]}` : '';
const newBaseUrl = baseUrl.replace(/\/[^/]*$/, '/ves_mncvv');
const targetUri = `${newBaseUrl}${queryParams}`;
const institutionId = new ObjectId("68e0e148f633a16a99a9df2e");

async function printJuneDbStatus() {
  const client = new MongoClient(targetUri);
  try {
    await client.connect();
    const db = client.db('ves_mncvv');
    const usersCollection = db.collection('users');
    const attendanceCollection = db.collection('attendances');
    const ondutyCollection = db.collection('onduties');
    const leavesCollection = db.collection('leaves');
    const holidaysCollection = db.collection('holidays');

    const startDate = moment("2026-06-01").startOf('day').toDate();
    const endDate = moment("2026-06-19").endOf('day').toDate();

    const users = await usersCollection.find({}).sort({ employeeNo: 1 }).toArray();

    // Fetch punches
    const attendanceAggregate = await attendanceCollection.aggregate([
      { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: {
            employeeNo: "$employeeNo",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          },
          firstCheckIn: { $min: "$timestamp" },
          lastCheckOut: { $max: "$timestamp" },
        },
      },
    ]).toArray();

    const attendanceMap = {};
    attendanceAggregate.forEach((a) => {
      if (!attendanceMap[a._id.employeeNo]) attendanceMap[a._id.employeeNo] = {};
      attendanceMap[a._id.employeeNo][a._id.date] = {
        firstCheckIn: a.firstCheckIn,
        lastCheckOut: a.lastCheckOut,
      };
    });

    // Fetch On Duty
    const onDutyRecords = await ondutyCollection.find({
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } }
      ]
    }).toArray();

    const onDutyMap = {};
    onDutyRecords.forEach(record => {
      let curr = moment(record.startDate).startOf('day');
      const endRec = moment(record.endDate).startOf('day');
      while (curr.isSameOrBefore(endRec)) {
        const dateStr = curr.format("YYYY-MM-DD");
        if (!onDutyMap[record.employeeNo]) onDutyMap[record.employeeNo] = {};
        onDutyMap[record.employeeNo][dateStr] = true;
        curr.add(1, 'day');
      }
    });

    // Fetch Leaves
    const leaves = await leavesCollection.find({
      status: "approved",
      leaveDate: { $gte: startDate, $lte: endDate }
    }).toArray();

    const userLeavesMap = {};
    leaves.forEach(l => {
      const dateStr = moment(l.leaveDate).format("YYYY-MM-DD");
      if (!userLeavesMap[l.employeeNo]) userLeavesMap[l.employeeNo] = {};
      userLeavesMap[l.employeeNo][dateStr] = l.type;
    });

    // Fetch Holidays
    const holidays = await holidaysCollection.find({
      isActive: true,
      $and: [
        { endDate: { $gte: startDate } },
        { startDate: { $lte: endDate } }
      ]
    }).toArray();

    const holidayDates = new Set();
    holidays.forEach(h => {
      let curr = moment(h.startDate).startOf("day");
      const hEnd = moment(h.endDate).startOf("day");
      while (curr.isSameOrBefore(hEnd)) {
        holidayDates.add(curr.format("YYYY-MM-DD"));
        curr.add(1, "day");
      }
    });

    // Define weekends
    const sundays = ["2026-06-07", "2026-06-14"];
    const secondSaturdays = ["2026-06-13"];

    const dbStatusGrid = {};
    users.forEach(user => {
      const daily = {};
      for (let day = 1; day <= 19; day++) {
        const dateStr = `2026-06-${String(day).padStart(2, '0')}`;
        const currentDate = moment(dateStr, "YYYY-MM-DD");

        const isMaternityFallback = user.employeeNo === '033';
        if (isMaternityFallback) {
          daily[dateStr] = "MTL";
          continue;
        }

        if (sundays.includes(dateStr) || secondSaturdays.includes(dateStr) || holidayDates.has(dateStr)) {
          daily[dateStr] = "-";
          continue;
        }

        if (userLeavesMap[user.employeeNo]?.[dateStr]) {
          daily[dateStr] = "L";
          continue;
        }

        if (onDutyMap[user.employeeNo]?.[dateStr]) {
          daily[dateStr] = "OD";
          continue;
        }

        const att = attendanceMap[user.employeeNo]?.[dateStr];
        if (!att) {
          daily[dateStr] = "A"; // Absent in DB due to no punches
        } else {
          // Has punches
          daily[dateStr] = "P";
        }
      }
      dbStatusGrid[user.employeeNo] = {
        name: user.name,
        daily
      };
    });

    fs.writeFileSync('db_june_status.json', JSON.stringify(dbStatusGrid, null, 2));
    console.log("SUCCESS: Written DB status grid to db_june_status.json");

  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

printJuneDbStatus();
