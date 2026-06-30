import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DB_NAME = 'ves_mncvv';
const institutionId = '68e0e148f633a16a99a9df2e'; // MNCVV
let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
mongoUri = mongoUri.replace(/\/[^/?]+(\?|$)/, `/${DB_NAME}$1`);

async function run() {
  console.log(`Connecting to database: ${DB_NAME}...`);
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  console.log('Connected.');

  try {
    // Define Schemas/Models inline
    const UserSchema = new mongoose.Schema({
      employeeNo: String,
      employeeNoHikvision: String,
      name: String,
      institutionId: mongoose.Schema.Types.ObjectId
    });
    const User = conn.model('User', UserSchema, 'users');

    const AttendanceSchema = new mongoose.Schema({
      institutionId: mongoose.Schema.Types.ObjectId,
      employeeNo: String,
      eventType: String,
      timestamp: Date,
      raw: mongoose.Schema.Types.Mixed
    });
    const Attendance = conn.model('Attendance', AttendanceSchema, 'attendances');

    let OnDuty = null;
    try {
      const OnDutySchema = new mongoose.Schema({
        employeeNo: String,
        startDate: Date,
        endDate: Date,
        description: String,
        institutionId: mongoose.Schema.Types.ObjectId
      });
      OnDuty = conn.model('OnDuty', OnDutySchema, 'onduties');
    } catch (e) {
      console.log('OnDuty model creation skipped or already exists.');
    }

    // 1. Load users for accurate name lookup
    console.log('Loading users...');
    const users = await User.find({ institutionId }).lean();
    const userMap = {};
    users.forEach(u => {
      if (u.employeeNo) userMap[u.employeeNo.trim()] = u.name;
      if (u.employeeNoHikvision) userMap[u.employeeNoHikvision.trim()] = u.name;
    });
    console.log(`Loaded ${users.length} users.`);

    // 2. Load on-duty records
    console.log('Loading on-duty records...');
    const onDutyMap = {};
    if (OnDuty) {
      try {
        const onDutyRecords = await OnDuty.find({ institutionId }).lean();
        onDutyRecords.forEach(duty => {
          if (!duty.employeeNo) return;
          const empNo = duty.employeeNo.trim();
          
          // Parse start/end dates
          const start = new Date(duty.startDate);
          const end = new Date(duty.endDate);
          
          // Loop through each day in range
          const curr = new Date(start);
          while (curr <= end) {
            // Format to YYYY-MM-DD
            const dateStr = curr.toISOString().split('T')[0];
            const key = `${empNo}_${dateStr}`;
            onDutyMap[key] = duty.description || 'On Duty';
            
            // Add one day
            curr.setDate(curr.getDate() + 1);
          }
        });
        console.log(`Loaded on-duty ranges.`);
      } catch (err) {
        console.warn('Could not load on-duty records:', err.message);
      }
    }

    // 3. Load attendance records
    console.log('Loading attendance records (this may take a few seconds)...');
    const records = await Attendance.find({ institutionId }).lean();
    console.log(`Loaded ${records.length} raw attendance records.`);

    // 4. Group by date and employee
    console.log('Grouping records by date and employee...');
    const groupedByDate = {}; // dateKey -> { employeeNo -> { inTime, outTime, ... } }

    records.forEach(r => {
      if (!r.employeeNo || !r.timestamp) return;

      const empNo = r.employeeNo.trim();
      const dt = new Date(r.timestamp);
      if (isNaN(dt.getTime())) return;

      // Convert UTC timestamp to IST Date string (YYYY-MM-DD)
      // IST is UTC +05:30
      const istTime = new Date(dt.getTime() + (5.5 * 60 * 60 * 1000));
      const dateKey = istTime.toISOString().split('T')[0];

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {};
      }

      if (!groupedByDate[dateKey][empNo]) {
        groupedByDate[dateKey][empNo] = {
          employeeNo: empNo,
          name: userMap[empNo] || r.raw?.name || r.raw?.employeeName || 'Unknown',
          inTime: dt,
          outTime: dt,
          status: 'Present',
          onDutyDescription: ''
        };
      } else {
        if (dt < groupedByDate[dateKey][empNo].inTime) {
          groupedByDate[dateKey][empNo].inTime = dt;
        }
        if (dt > groupedByDate[dateKey][empNo].outTime) {
          groupedByDate[dateKey][empNo].outTime = dt;
        }
      }
    });

    // 5. Apply on-duty status & add absent on-duty users
    Object.keys(onDutyMap).forEach(key => {
      const [empNo, dateKey] = key.split('_');
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {};
      }
      if (!groupedByDate[dateKey][empNo]) {
        groupedByDate[dateKey][empNo] = {
          employeeNo: empNo,
          name: userMap[empNo] || 'Unknown',
          inTime: null,
          outTime: null,
          status: 'On Duty',
          onDutyDescription: onDutyMap[key]
        };
      } else {
        groupedByDate[dateKey][empNo].status = 'On Duty';
        groupedByDate[dateKey][empNo].onDutyDescription = onDutyMap[key];
      }
    });

    // 6. Filter valid years (2025/2026) and sort date sheets newest first
    const sortedDates = Object.keys(groupedByDate)
      .filter(d => d.startsWith('2025') || d.startsWith('2026'))
      .sort((a, b) => b.localeCompare(a));

    console.log(`Found ${sortedDates.length} unique dates to export.`);

    // 7. Create Excel workbook
    const workbook = new ExcelJS.Workbook();

    for (const dateKey of sortedDates) {
      console.log(`Adding sheet: ${dateKey}...`);
      const ws = workbook.addWorksheet(dateKey);
      
      // Explicitly show grid lines
      ws.views = [{ showGridLines: true }];

      ws.columns = [
        { header: 'Employee No', key: 'employeeNo', width: 18 },
        { header: 'Name', key: 'name', width: 28 },
        { header: 'In Time (IST)', key: 'inTime', width: 18 },
        { header: 'Out Time (IST)', key: 'outTime', width: 18 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'On Duty Description', key: 'onDutyDescription', width: 38 }
      ];

      // Format Header Row
      const headerRow = ws.getRow(1);
      headerRow.height = 25;
      headerRow.eachCell(cell => {
        cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '1F4E78' } // Premium Deep Navy Blue
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'D3D3D3' } },
          left: { style: 'thin', color: { argb: 'D3D3D3' } },
          bottom: { style: 'medium', color: { argb: '000000' } },
          right: { style: 'thin', color: { argb: 'D3D3D3' } }
        };
      });

      // Sort employee records inside the sheet by ID
      const dayRecords = Object.values(groupedByDate[dateKey]).sort((a, b) => a.employeeNo.localeCompare(b.employeeNo));

      dayRecords.forEach(item => {
        let inTimeStr = 'N/A';
        let outTimeStr = 'N/A';

        if (item.inTime) {
          // Format In-Time in IST (+05:30)
          const istIn = new Date(item.inTime.getTime() + (5.5 * 60 * 60 * 1000));
          inTimeStr = istIn.toISOString().substr(11, 8);
        }

        if (item.outTime && item.inTime) {
          // Only show Out-Time if there is more than 1 punch (not equal timestamps)
          if (item.outTime.getTime() !== item.inTime.getTime()) {
            const istOut = new Date(item.outTime.getTime() + (5.5 * 60 * 60 * 1000));
            outTimeStr = istOut.toISOString().substr(11, 8);
          }
        }

        const row = ws.addRow({
          employeeNo: item.employeeNo,
          name: item.name,
          inTime: inTimeStr,
          outTime: outTimeStr,
          status: item.status,
          onDutyDescription: item.onDutyDescription
        });

        row.height = 20;

        // Cell Alignments
        row.getCell('employeeNo').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('inTime').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('outTime').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('status').alignment = { vertical: 'middle', horizontal: 'center' };
        row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
        row.getCell('onDutyDescription').alignment = { vertical: 'middle', horizontal: 'left' };

        // Font and Borders
        row.eachCell(cell => {
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.border = {
            top: { style: 'thin', color: { argb: 'E0E0E0' } },
            left: { style: 'thin', color: { argb: 'E0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'E0E0E0' } },
            right: { style: 'thin', color: { argb: 'E0E0E0' } }
          };
        });

        // Styling for On-Duty records
        if (item.status === 'On Duty') {
          row.eachCell(cell => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'F2F7FA' } // Light Blue tint
            };
            cell.font = { name: 'Segoe UI', size: 10, italic: true };
          });
        }
      });
    }

    // 8. Save Workbook to static downloads directory
    const outputDir = 'public/downloads';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputPath = path.join(outputDir, 'attendance_by_date.xlsx');
    console.log(`Writing workbook to: ${outputPath}...`);
    await workbook.xlsx.writeFile(outputPath);
    console.log('Workbook successfully created and written to disk.');

  } catch (err) {
    console.error('An error occurred:', err);
  } finally {
    await conn.close();
    console.log('Database connection closed.');
  }
}

run();
