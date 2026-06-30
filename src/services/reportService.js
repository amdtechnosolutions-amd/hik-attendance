import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import moment from 'moment-timezone';

export function calculateAttendanceStatus(users, targetDate, shouldHideCheckout) {
  const workingStart = moment(targetDate).hour(9).minute(0).second(0);
  const lateThreshold = moment(targetDate).hour(8).minute(30).second(0);
  const noonTime = moment(targetDate).hour(12).minute(0).second(0);
  const halfDayLimit = moment(targetDate).hour(16).minute(30).second(0);

  const lateUsers = [];
  const absentees = [];

  users.forEach(user => {
    if (user.onDuty) {
      user.lateBy = "";
      return;
    }

    const att = user.attendance?.[0];
    if (!att) {
      user.status = "A";
      user.lateBy = "";
      absentees.push(user);
      return;
    }

    const checkIn = moment(att.firstCheckIn);
    const checkOut = moment(att.lastCheckOut);

    const isLate = checkIn.isAfter(workingStart);

    let isHalfDay = false;
    if (!shouldHideCheckout) {
      if (checkIn.isAfter(noonTime) || checkOut.isBefore(halfDayLimit)) {
        isHalfDay = true;
      }
    }

    user.lateBy = isLate
      ? Math.floor((checkIn - workingStart) / 60000) + " mins"
      : "";

    if (shouldHideCheckout) {
      user.status = isLate ? "PL" : "P";
    } else {
      if (!isLate && isHalfDay) user.status = "P/HD";
      else if (!isLate) user.status = "P";
      else if (isLate && isHalfDay) user.status = "PL/HD";
      else user.status = "PL";
    }

    if (checkIn.isAfter(lateThreshold)) {
      lateUsers.push(user);
    }
  });

  return { users, lateUsers, absentees };
}

export async function createAttendanceExcel(data, title, fileName, reportsDir, formattedDate, institution, shouldHideCheckout = false, includeRemarks = true) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Attendance");

  const headers = includeRemarks
    ? ["Employee No", "Name", "Check-In", "Check-Out", "Late By", "Status", "Remarks"]
    : ["Employee No", "Name", "Check-In", "Check-Out", "Late By", "Status"];

  ws.addRow([title]).font = { bold: true, size: 14 };
  ws.addRow([`Date: ${formattedDate}`]);
  ws.addRow(headers);

  data.forEach(user => {
    // Support both new (direct properties) and old (nested attendance) formats
    const firstCheckIn = user.firstCheckIn || user.attendance?.[0]?.firstCheckIn;
    const lastCheckOut = user.lastCheckOut || user.attendance?.[0]?.lastCheckOut;

    const checkOutTime =
      shouldHideCheckout ? "" :
        lastCheckOut
          ? moment(lastCheckOut).tz("Asia/Kolkata").format("HH:mm")
          : "";

    const row = [
      `${institution.shortName?.toUpperCase() || "ORG"}-${user.employeeNo}`,
      user.name?.toUpperCase(),
      firstCheckIn
        ? moment(firstCheckIn).tz("Asia/Kolkata").format("HH:mm")
        : "",
      checkOutTime,
      user.lateBy || "",
      user.status || "",
    ];

    if (includeRemarks) row.push("");

    ws.addRow(row);
  });

  const filePath = path.join(reportsDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

export async function createAttendancePDF(data, title, fileName, reportsDir, formattedDate, institution, shouldHideCheckout = false, includeRemarks = true) {
  const pdfPath = path.join(reportsDir, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 30,
      size: "A3",
      layout: "landscape",
      bufferPages: true
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const rowHeight = 20;
    const left = 50;

    const colWidths = includeRemarks
      ? [80, 220, 80, 80, 80, 80, 200, 200]
      : [80, 220, 80, 80, 80, 120, 200];

    const headers = includeRemarks
      ? ["Employee No", "Name", "Check-In", "Check-Out", "Late By", "Status", "On Duty Desc", "Remarks"]
      : ["Employee No", "Name", "Check-In", "Check-Out", "Late By", "Status", "On Duty Desc"];

    const drawHeader = () => {
      const logoPath = path.join(process.cwd(), "public", "logo.png");

      try {
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 30, 20, { width: 80 });
        }
      } catch (err) {
        console.log("⚠️ Logo not found:", logoPath);
      }

      doc.fontSize(18)
        .font("Helvetica-Bold")
        .text(title, 0, 35, { align: "center" });

      doc.fontSize(12)
        .font("Helvetica")
        .text(`Date: ${formattedDate}`, { align: "center" });

      doc.moveDown(1.8);

      const headerStartY = doc.y + 10;
      doc.y = headerStartY;

      let x = left;
      let y = doc.y;

      headers.forEach((header, i) => {
        doc.rect(x, y, colWidths[i], rowHeight)
          .fill("#8B4513")
          .stroke();

        doc.fillColor("white")
          .font("Helvetica-Bold")
          .fontSize(10)
          .text(header, x + 5, y + 5, {
            width: colWidths[i] - 10,
            align: "center"
          });

        x += colWidths[i];
      });

      doc.fillColor("black");

      return y + rowHeight;
    };

    let y = drawHeader();

    data.forEach(user => {

      // Support both new (direct properties) and old (nested attendance) formats
      const firstCheckIn = user.firstCheckIn || user.attendance?.[0]?.firstCheckIn;
      const lastCheckOut = user.lastCheckOut || user.attendance?.[0]?.lastCheckOut;
      const isOnDuty = user.isOnDuty || user.onDuty;
      const desc = user.onDutyDescription || "";

      const checkOutTime =
        shouldHideCheckout ? "" :
          lastCheckOut
            ? moment(lastCheckOut).tz("Asia/Kolkata").format("HH:mm")
            : "";

      const row = [
        `${institution.shortName?.toUpperCase() || "ORG"}-${user.employeeNo}`,
        user.name?.toUpperCase(),
        firstCheckIn
          ? moment(firstCheckIn).tz("Asia/Kolkata").format("HH:mm")
          : "",
        checkOutTime,
        user.lateBy || "",
        user.status || "",
        desc
      ];

      if (includeRemarks) row.push("");

      let x = left;

      if (y + rowHeight > doc.page.height - 80) {
        doc.addPage({ size: "A3", layout: "landscape", margin: 30 });
        y = drawHeader();
      }

      row.forEach((text, i) => {
        if (isOnDuty) {
          doc.rect(x, y, colWidths[i], rowHeight)
            .fill("#E6F0FF")
            .stroke();
        } else {
          doc.rect(x, y, colWidths[i], rowHeight).stroke();
        }

        doc.fillColor("black")
          .font("Helvetica")
          .fontSize(9)
          .text(text, x + 5, y + 5, {
            width: colWidths[i] - 10,
            align: "center"
          });

        x += colWidths[i];
      });

      y += rowHeight;
    });

    // Add Principal Signature at the end of the PDF
    const signatureHeight = 110;
    if (y + signatureHeight > doc.page.height - 50) {
      doc.addPage({ size: "A3", layout: "landscape", margin: 30 });
      y = 50;
    } else {
      y += 40;
    }

    doc.fillColor("black")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("Principal Signature", doc.page.width - 250, y, {
        width: 200,
        align: "center"
      });

    doc.fontSize(11)
      .font("Helvetica")
      .text("S.SUJATHA DOLLY", doc.page.width - 250, y + 50, {
        width: 200,
        align: "center"
      });

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return pdfPath;
}
