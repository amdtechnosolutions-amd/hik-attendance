import User from '../models/User.js';
import Device from '../models/Device.js';
import { addPersonToDevice } from '../services/hikvisionService.js';
import { formatISAPITime } from '../utils/timeUtil.js';
import { fetchUsersFromDevice } from '../services/deviceService.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import Institution from '../models/Institution.js';
import moment from "moment-timezone";
import PDFDocument from "pdfkit";
import Attendance from '../models/Attendance.js';

// This is a fixed version of getUsersWithMonthlyDailyStatusSummary function
// The main fix is using institution from req.institutionDb instead of querying it again
async function getUsersWithMonthlyDailyStatusSummary(req, res) {
  try {
    const { institutionId } = req.params;
    const { month, year } = req.query;
    // Get institution-specific models and institution from middleware
    const { models, institution } = req.institutionDb;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and Year required" });
    }

    const startDate = moment(`${year}-${month}-01`).startOf('month').toDate();
    const endDate = moment(startDate).endOf('month').toDate();

    if (!institution) {
      return res.status(404).json({ success: false, message: "Institution not found" });
    }
    
    console.log(`Processing monthly daily status for institution: ${institution.name}, month: ${month}, year: ${year}`);

    // Use institution-specific User model
    const users = await models.User.find({ institutionId }).lean();
    console.log(`Found ${users.length} users for institution ${institutionId}`);

    // Use institution-specific Attendance model
    console.log(`Searching for attendance records between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    const attendanceAggregate = await models.Attendance.aggregate([
      {
        $match: {
          institutionId: new mongoose.Types.ObjectId(institutionId),
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            employeeNo: "$employeeNo",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
          },
          firstCheckIn: { $min: "$timestamp" },
          lastCheckOut: { $max: "$timestamp" }
        }
      }
    ]);
    
    console.log(`Found ${attendanceAggregate.length} attendance records`);

    const attendanceMap = {};
    attendanceAggregate.forEach(a => {
      if (!attendanceMap[a._id.employeeNo]) attendanceMap[a._id.employeeNo] = {};
      attendanceMap[a._id.employeeNo][a._id.date] = {
        firstCheckIn: a.firstCheckIn,
        lastCheckOut: a.lastCheckOut,
      };
    });

    const daysInMonth = moment(startDate).daysInMonth();

    const sundays = [];
    const secondSaturdays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = moment(`${year}-${month}-${d}`, "YYYY-MM-DD");
      if (date.day() === 0) sundays.push(date.format("YYYY-MM-DD"));
      if (date.day() === 6 && d >= 8 && d <= 14) secondSaturdays.push(date.format("YYYY-MM-DD"));
    }

    const totalDaysInMonth = daysInMonth;
    const totalWeekendDays = sundays.length + secondSaturdays.length;
    const totalWorkingDays = totalDaysInMonth - totalWeekendDays;
    const today = moment().startOf('day');

    const reportingTime = moment(`${year}-${month}-01 09:00:00`);
    const noonTime = moment(`${year}-${month}-01 12:00:00`);
    const halfDayEnd = moment(`${year}-${month}-01 16:30:00`);

    const daysPerPage = 15;
    const pdfColWidthDays = 45;
    const pdfColWidthTotals = 25;
    const pdfColWidthEmpNo = 120;
    const pdfColWidthName = 200;

    console.log(`Generating summaries for ${users.length} users with ${Object.keys(attendanceMap).length} attendance records`);
    const summaries = users.map(user => {
      let totalPresent = 0, totalAbsent = 0, totalLeave = 0, totalHalfDay = 0, totalLate = 0;
      let dailyStatus = {};

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = moment(`${year}-${month}-${d}`, "YYYY-MM-DD").format("YYYY-MM-DD");

        if (moment(dateStr).isAfter(today)) {
          dailyStatus[dateStr] = "-";
          continue;
        }

        if (sundays.includes(dateStr) || secondSaturdays.includes(dateStr)) {
          dailyStatus[dateStr] = "L";
          totalLeave++;
          continue;
        }

        if (user.leaveDays && user.leaveDays.includes(dateStr)) {
          dailyStatus[dateStr] = "L";
          totalLeave++;
          continue;
        }

        const att = attendanceMap[user.employeeNo]?.[dateStr];
        if (!att) {
          dailyStatus[dateStr] = "A";
          totalAbsent++;
          continue;
        }

        const checkIn = moment(att.firstCheckIn);
        const checkOut = moment(att.lastCheckOut);
        const isLate = checkIn.isAfter(reportingTime);
        const isHalfDay = checkIn.isSameOrAfter(noonTime) || checkOut.isSameOrBefore(halfDayEnd);

        if (isLate) totalLate++;
        if (isHalfDay) totalHalfDay++;

        if (isLate && isHalfDay) dailyStatus[dateStr] = "PL/HD";
        else if (isLate) dailyStatus[dateStr] = "PL";
        else if (isHalfDay) dailyStatus[dateStr] = "HD";
        else {
          dailyStatus[dateStr] = "P";
          totalPresent++;
        }
      }

      const lateHalfDayLeave = Math.floor(totalLate / 3);
      totalHalfDay += lateHalfDayLeave;

      return {
        employeeNo: user.employeeNo,
        name: user.name,
        dailyStatus,
        totalPresent,
        totalAbsent,
        totalLeave,
        totalHalfDay,
        totalLate,
        totalWorkingDays,
      };
    });

    const reportsDir = path.join(process.cwd(), "public", "reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const reportLabel = `${month}_${year}`;
    const excelFileName = `monthly_daily_status_${institutionId}_${reportLabel}.xlsx`;
    const excelFilePath = path.join(reportsDir, excelFileName);
    const pdfFileName = `monthly_daily_status_${institutionId}_${reportLabel}.pdf`;
    const pdfFilePath = path.join(reportsDir, pdfFileName);

    // Excel report
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Monthly Daily Status");

    worksheet.mergeCells("A1:" + String.fromCharCode(65 + daysInMonth + 7) + "1");
    worksheet.getCell("A1").value = `${institution.name} - Monthly Daily Attendance Status`;
    worksheet.getCell("A1").font = { size: 14, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    worksheet.mergeCells("A2:" + String.fromCharCode(65 + daysInMonth + 7) + "2");
    worksheet.getCell("A2").value = `Month: ${month} - Year: ${year}  | Total Working Days: ${totalWorkingDays}`;
    worksheet.getCell("A2").alignment = { horizontal: "center" };
    worksheet.getCell("A2").font = { bold: true };

    let headerRow = ['Employee No', 'Name'];
    for (let d = 1; d <= daysInMonth; d++) {
      headerRow.push(d.toString());
    }
    headerRow.push('P', 'A', 'L', 'HD', 'LT', 'WD');

    worksheet.addRow(headerRow).eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
      if (colNumber === 1) {
        cell.alignment = { horizontal: 'left' };
      }
    });

    summaries.forEach(user => {
      const row = [];
      row[0] = `KUN-${institution.shortName.toUpperCase() || ""}-${user.employeeNo}`;
      row[1] = user.name.toUpperCase();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = moment(`${year}-${month}-${d}`, "YYYY-MM-DD").format("YYYY-MM-DD");
        row.push(user.dailyStatus[dateStr] || '-');
      }
      row.push(user.totalPresent, user.totalAbsent, user.totalLeave, user.totalHalfDay, user.totalLate, user.totalWorkingDays);

      const addRow = worksheet.addRow(row);
      addRow.getCell(1).alignment = { horizontal: 'left' };
    });

    await workbook.xlsx.writeFile(excelFilePath);

    // PDF generation with pagination every 15 days
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A3', layout: 'landscape', margin: 30 });
      const stream = fs.createWriteStream(pdfFilePath);
      doc.pipe(stream);

      try {
        const imgPath = path.join(process.cwd(), 'public', 'logo.png');
        if (fs.existsSync(imgPath)) {
          const logo = fs.readFileSync(imgPath);
          const imgWidth = 80;
          const imgHeight = 80;
          doc.image(logo, (doc.page.width - imgWidth) / 2, 30, { width: imgWidth, height: imgHeight });
          doc.moveDown(6);
        }
      } catch (e) { }

      doc.fontSize(14).font('Helvetica-Bold').text(`${institution.name} - Monthly Daily Attendance Status`, { align: 'center' });
      doc.fontSize(12).text(`Month: ${month} - Year: ${year}`, { align: 'center' });
      doc.fontSize(12).text(`Total Working Days: ${totalWorkingDays}`, { align: 'center' });
      doc.moveDown();

      const leftMargin = 30;
      const rowHeight = 20;

      let y = 160;

      for (let pageStartDay = 1; pageStartDay <= daysInMonth; pageStartDay += daysPerPage) {
        if (pageStartDay !== 1) {
          doc.addPage();
          y = 50;
        }

        let x = leftMargin;
        const pageEndDay = Math.min(pageStartDay + daysPerPage - 1, daysInMonth);

        const headers = ['Employee No', 'Name'];
        for (let d = pageStartDay; d <= pageEndDay; d++) {
          headers.push(d.toString());
        }
        headers.push('P', 'A', 'L', 'HD', 'LT', 'WD');

        const colWidths = [];
        colWidths.push(pdfColWidthEmpNo);
        colWidths.push(pdfColWidthName);
        for (let i = 0; i < (pageEndDay - pageStartDay + 1); i++) colWidths.push(pdfColWidthDays);
        for (let i = 0; i < 6; i++) colWidths.push(pdfColWidthTotals);

        headers.forEach((header, i) => {
          doc.rect(x, y, colWidths[i], rowHeight).fill('#8B4513').stroke();
          doc.fillColor('white').text(header, x + 2, y + 5, { width: colWidths[i] - 4, align: 'center' });
          x += colWidths[i];
        });
        y += rowHeight;
        doc.fillColor('black');

        summaries.forEach(user => {
          if (y + rowHeight > doc.page.height - 70) {
            doc.addPage();
            y = 50;
            x = leftMargin;
            headers.forEach((header, i) => {
              doc.rect(x, y, colWidths[i], rowHeight).fill('#8B4513').stroke();
              doc.fillColor('white').text(header, x + 2, y + 5, { width: colWidths[i] - 4, align: 'center' });
              x += colWidths[i];
            });
            y += rowHeight;
            doc.fillColor('black');
          }

          x = leftMargin;
          const empNoFormatted = `KUN-${institution.shortName.toUpperCase() || ""}-${user.employeeNo}`;
          const rowData = [empNoFormatted, user.name.toUpperCase()];

          for (let d = pageStartDay; d <= pageEndDay; d++) {
            const dateStr = moment(`${year}-${month}-${d}`, "YYYY-MM-DD").format("YYYY-MM-DD");
            rowData.push(user.dailyStatus[dateStr] || '-');
          }

          rowData.push(user.totalPresent, user.totalAbsent, user.totalLeave, user.totalHalfDay, user.totalLate, user.totalWorkingDays);

          rowData.forEach((text, idx) => {
            doc.rect(x, y, colWidths[idx], rowHeight).stroke();
            doc.text(String(text), x + 2, y + 5, { width: colWidths[idx] - 4, align: 'center' });
            x += colWidths[idx];
          });

          y += rowHeight;
        });
      }

      doc.fontSize(10).text(
        "P = Present   A = Absent   L = Leave   HD = Half Day   LT = Late   WD = Working Days",
        leftMargin, y + 15, { align: 'left' }
      );

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    console.log(`Sending response with ${summaries.length} user summaries`);
    res.json({
      success: true,
      month,
      year,
      excelDownload: `/reports/${excelFileName}`,
      pdfDownload: `/reports/${pdfFileName}`,
      summaries
    });

  } catch (error) {
    console.error("Error generating monthly daily summary: ", error);
    res.status(500).json({ success: false, message: "Failed to generate monthly daily summary" });
  }
}

export { getUsersWithMonthlyDailyStatusSummary };