import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import xlsx from "xlsx";
import PDFDocument from "pdfkit";

/**
 * Upload On Duty records from Excel file
 * @param {Object} req - Express request object with file
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with upload results
 */
export const uploadOnDutyExcel = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const User = models.User;
    const OnDuty = models.OnDuty;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const filePath = req.file.path;
    console.log("📘 Reading Excel:", filePath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    const totalRows = worksheet.rowCount;
    console.log("📄 Total Rows Found:", totalRows);

    // === REQUIRED HEADERS ===
    const requiredHeaders = ["EmployeeNo", "StartDate", "EndDate", "Description"];
    const headers = worksheet.getRow(1).values;
    // Note: headers[0] is empty

    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingHeaders.join(", ")}`,
      });
    }

    // === HEADER INDEXES ===
    // NO +1 here because headers array is 1-indexed
    const employeeNoIdx = headers.indexOf("EmployeeNo");
    const startDateIdx = headers.indexOf("StartDate");
    const endDateIdx = headers.indexOf("EndDate");
    const descriptionIdx = headers.indexOf("Description");

    // === HELPERS ===
    const getCellTextOrDate = (cell) => {
      if (!cell || cell.value === undefined || cell.value === null) return "";

      if (cell.type === ExcelJS.ValueType.Date) {
        // Excel true date type
        return moment(cell.value).format("YYYY-MM-DD");
      } else if (typeof cell.value === "number") {
        // Excel serial date number (e.g. 45940)
        const dateFromSerial = new Date(Math.round((cell.value - 25569) * 86400 * 1000));
        return moment(dateFromSerial).format("YYYY-MM-DD");
      } else if (typeof cell.value === "string") {
        return cell.value.trim();
      } else if (cell.text) {
        return cell.text.trim();
      }

      return "";
    };

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    const bulkPromises = [];

    // === PROCESS EACH ROW ===
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      try {
        const employeeNo = String(row.getCell(employeeNoIdx).text || "").trim();
        const startDateStr = getCellTextOrDate(row.getCell(startDateIdx));
        const endDateStr = getCellTextOrDate(row.getCell(endDateIdx));
        const description = (row.getCell(descriptionIdx).text || "").trim();

        console.log({ rowNumber, employeeNo, startDateStr, endDateStr, description });

        if (!employeeNo) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Missing Employee No`);
          return;
        }
        if (!startDateStr || !endDateStr || !description) {
          results.failed++;
          results.errors.push(
            `Row ${rowNumber}: Missing Start Date, End Date, or Description for EmployeeNo ${employeeNo}`
          );
          return;
        }

        const startDate = moment(startDateStr, ["YYYY-MM-DD", "DD-MM-YYYY"]).toDate();
        const endDate = moment(endDateStr, ["YYYY-MM-DD", "DD-MM-YYYY"]).toDate();

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          results.failed++;
          results.errors.push(
            `Row ${rowNumber}: Invalid date format for EmployeeNo ${employeeNo}. Use YYYY-MM-DD`
          );
          return;
        }
        if (startDate > endDate) {
          results.failed++;
          results.errors.push(
            `Row ${rowNumber}: Start date must be before end date for EmployeeNo ${employeeNo}`
          );
          return;
        }

        // === CREATE ONDUTY ENTRY ===
        const createPromise = User.findOne({ employeeNo })
          .then((user) => {
            if (!user) {
              results.failed++;
              results.errors.push(`Row ${rowNumber}: User not found for EmployeeNo ${employeeNo}`);
              return null;
            }
            return OnDuty.create({
              institutionId,
              userId: user._id,
              employeeNo: user.employeeNo,
              startDate,
              endDate,
              description,
            })
              .then(() => {
                results.success++;
              })
              .catch((err) => {
                results.failed++;
                results.errors.push(
                  `Row ${rowNumber}: Failed to create OnDuty record for ${employeeNo} - ${err.message}`
                );
              });
          })
          .catch((err) => {
            results.failed++;
            results.errors.push(`Row ${rowNumber}: Error finding user ${employeeNo} - ${err.message}`);
          });

        bulkPromises.push(createPromise);
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${rowNumber}: ${err.message}`);
      }
    });

    await Promise.all(bulkPromises);

    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      message: `Upload completed. ${results.success} records created, ${results.failed} failed`,
      summary: results
    });
  } catch (error) {
    console.error('Error in uploadOnDutyExcel:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to process uploaded Excel file',
      error: error.message
    });
  }
};

/**
 * Create a new On Duty record
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with created On Duty record or error
 */
export const createOnDuty = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const {
      userIds,         // array of users (for backward compatibility)
      entries,         // array of { userIds: [], description: "" }
      startDate,
      endDate,
      description,     // default description (for backward compatibility or fallback)
      type,
      session
    } = req.body;

    const { models } = req.institutionDb;
    const OnDuty = models.OnDuty;
    const User = models.User;

    // Normalize entries
    let normalizedEntries = [];
    if (Array.isArray(entries) && entries.length > 0) {
      normalizedEntries = entries;
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      normalizedEntries = [{ userIds, description }];
    }

    if (normalizedEntries.length === 0) {
      return res.status(400).json({ message: "userIds or entries must be a non-empty array" });
    }

    const allowedTypes = ['full-day', 'half-day-morning', 'half-day-afternoon'];
    const allowedSessions = ['full', 'morning', 'afternoon'];

    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    if (session && !allowedSessions.includes(session)) {
      return res.status(400).json({ message: "Invalid session" });
    }

    const createdRecords = [];

    for (const entry of normalizedEntries) {
      const entryUserIds = Array.isArray(entry.userIds) ? entry.userIds : (entry.userId ? [entry.userId] : []);
      const entryDescription = entry.description || description;
      const entryType = entry.type || type || "full-day";
      const entrySession = entry.session || session || "full";

      for (const userId of entryUserIds) {
        const user = await User.findById(userId).lean();
        if (!user) continue;

        const employeeNo = user.employeeNo;

        const record = await OnDuty.create({
          institutionId,
          userId,
          employeeNo,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          description: entryDescription,
          type: entryType,
          session: entrySession
        });

        createdRecords.push(record);
      }
    }

    res.status(201).json({
      message: "On Duty entries created successfully",
      count: createdRecords.length,
      data: createdRecords
    });

  } catch (err) {
    console.error('Error creating On Duty record:', err);
    res.status(500).json({
      message: "Failed to create On Duty record",
      error: err.message
    });
  }
};




/**
 * Download On Duty Excel template
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {File} - Excel template file
 */
export const downloadOnDutyTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('OnDuty Template');

    worksheet.columns = [
      { header: 'EmployeeNo', key: 'employeeNo', width: 15 },
      { header: 'StartDate', key: 'startDate', width: 15 },
      { header: 'EndDate', key: 'endDate', width: 15 },
      { header: 'Description', key: 'description', width: 30 }
    ];

    worksheet.addRow({
      employeeNo: 'EMP001',
      startDate: '2024-01-01',
      endDate: '2024-01-01',
      description: 'Sample on duty reason'
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=onduty_template.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Error generating On Duty template:', err);
    res.status(500).json({ message: "Failed to generate template", error: err.message });
  }
};

/**
 * Get On Duty records for a specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with user's On Duty records or error
 */
export const getUserOnDuty = async (req, res) => {
  try {
    const { institutionId, userId } = req.params;
    const { connection } = req.institutionDb;

    const OnDuty = connection.model('OnDuty');

    const onDutyRecords = await OnDuty.find({
      institutionId,
      userId
    }).sort({ startDate: -1 });

    res.status(200).json(onDutyRecords);
  } catch (err) {
    console.error(`Error fetching On Duty records for user ${req.params.userId}:`, err);
    res.status(500).json({ message: "Failed to fetch On Duty records", error: err.message });
  }
};

/**
 * Get all On Duty records for an institution
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with institution's On Duty records or error
 */
export const getInstitutionOnDuty = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { startDate, endDate } = req.query;
    const { connection } = req.institutionDb;

    // Get the OnDuty model from the institution database
    const OnDuty = connection.model('OnDuty');

    // Build query
    const query = { institutionId };

    // Add date filtering if provided
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) {
        query.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.endDate = { $lte: new Date(endDate) };
      }
    }

    // Get the User model to populate user details
    const User = connection.model('User');

    const onDutyRecords = await OnDuty.find(query)
      .sort({ startDate: -1 })
      .populate({
        path: 'userId',
        model: User,
        select: 'name employeeNo'
      });

    res.status(200).json(onDutyRecords);
  } catch (err) {
    console.error(`Error fetching On Duty records for institution ${req.params.institutionId}:`, err);
    res.status(500).json({ message: "Failed to fetch On Duty records", error: err.message });
  }
};

/**
 * Update an existing On Duty record
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with updated On Duty record or error
 */
export const updateOnDuty = async (req, res) => {
  try {
    const { institutionId, onDutyId } = req.params;
    const { startDate, endDate, description } = req.body;
    const { connection } = req.institutionDb;

    // Get the OnDuty model from the institution database
    const OnDuty = connection.model('OnDuty');

    // Find the On Duty record
    const onDuty = await OnDuty.findOne({
      _id: onDutyId,
      institutionId
    });

    if (!onDuty) {
      return res.status(404).json({ message: "On Duty record not found" });
    }

    // Update fields if provided
    if (startDate) {
      const startDateObj = new Date(startDate);
      if (isNaN(startDateObj.getTime())) {
        return res.status(400).json({ message: "Invalid start date format" });
      }
      onDuty.startDate = startDateObj;
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      if (isNaN(endDateObj.getTime())) {
        return res.status(400).json({ message: "Invalid end date format" });
      }
      onDuty.endDate = endDateObj;
    }

    // Validate that start date is before or equal to end date
    if (onDuty.startDate > onDuty.endDate) {
      return res.status(400).json({ message: "Start date must be before or equal to end date" });
    }

    if (description) {
      onDuty.description = description;
    }

    // Update the updatedAt timestamp
    onDuty.updatedAt = new Date();

    // Save the updated record
    await onDuty.save();

    res.status(200).json(onDuty);
  } catch (err) {
    console.error(`Error updating On Duty record ${req.params.onDutyId}:`, err);
    res.status(500).json({ message: "Failed to update On Duty record", error: err.message });
  }
};

/**
 * Delete an On Duty record
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with success message or error
 */
export const deleteOnDuty = async (req, res) => {
  try {
    const { institutionId, onDutyId } = req.params;
    const { connection } = req.institutionDb;

    // Get the OnDuty model from the institution database
    const OnDuty = connection.model('OnDuty');

    // Find and delete the On Duty record
    const result = await OnDuty.deleteOne({
      _id: onDutyId,
      institutionId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "On Duty record not found" });
    }

    res.status(200).json({ message: "On Duty record deleted successfully" });
  } catch (err) {
    console.error(`Error deleting On Duty record ${req.params.onDutyId}:`, err);
    res.status(500).json({ message: "Failed to delete On Duty record", error: err.message });
  }
};

/**
 * Delete On Duty records for specific dates and employees
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with deletion results
 */
export const deleteOnDutyByDates = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { startDate, endDate, employeeNos } = req.body;
    const { models } = req.institutionDb;
    const OnDuty = models.OnDuty;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Start date and end date are required"
      });
    }

    // Convert dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD"
      });
    }

    // Build query
    const query = {
      institutionId,
      $or: [
        // Case 1: OD record starts within the date range
        { startDate: { $gte: start, $lte: end } },
        // Case 2: OD record ends within the date range
        { endDate: { $gte: start, $lte: end } },
        // Case 3: OD record spans the entire date range
        { startDate: { $lte: start }, endDate: { $gte: end } }
      ]
    };

    // Add employee filter if provided
    if (employeeNos && employeeNos.length > 0) {
      query.employeeNo = { $in: employeeNos };
    }

    console.log("Deleting On Duty records with query:", JSON.stringify(query, null, 2));

    // Delete matching records
    const result = await OnDuty.deleteMany(query);

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} On Duty records`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Error deleting On Duty records:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete On Duty records",
      error: error.message
    });
  }
};

export const getInstitutionOnDutySummary = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { month, year } = req.query;
    const { connection, institution } = req.institutionDb;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Missing required query parameters: month, year'
      });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    const monthName = startDate.toLocaleString('default', { month: 'long' });

    const OnDuty = connection.model('OnDuty');
    const User = connection.model('User');

    // Query for OD records that overlap with the selected month
    const query = {
      institutionId,
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    };

    const odRecords = await OnDuty.find(query)
      .populate('userId', 'name employeeNo')
      .sort({ startDate: 1 });

    const data = odRecords.map(record => ({
      employeeNo: record.employeeNo,
      name: record.userId?.name || 'Unknown',
      type: record.type,
      startDate: moment(record.startDate).format('DD-MM-YYYY'),
      endDate: moment(record.endDate).format('DD-MM-YYYY'),
      description: record.description || '-'
    }));

    // Reports Directory
    const reportsDir = path.join(process.cwd(), "public", "reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const timestamp = Date.now();
    const pdfFileName = `onduty_report_${institutionId}_${timestamp}.pdf`;
    const excelFileName = `onduty_report_${institutionId}_${timestamp}.xlsx`;
    const pdfFilePath = path.join(reportsDir, pdfFileName);
    const excelFilePath = path.join(reportsDir, excelFileName);

    // --- PDF Generation ---
    const generatePDF = () => new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        const stream = fs.createWriteStream(pdfFilePath);
        doc.pipe(stream);

        // Header
        let y = 20;
        const logoPath = path.join(process.cwd(), "public", "logo.png");
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, (doc.page.width - 50) / 2, y, { width: 50, height: 50 });
          y += 60; // 50 height + spacing
        } else {
          y += 20;
        }

        const instName = institution?.name || "Institution";
        doc.fontSize(14).font("Helvetica-Bold").text(instName, 0, y, { align: "center", width: doc.page.width });
        y += 20;
        doc.fontSize(12).font("Helvetica").text(`On Duty Report - ${monthName} ${year}`, 0, y, { align: "center", width: doc.page.width });
        doc.moveDown(2);

        // Table configuration
        const startX = 30;
        let currentY = doc.y + 20;
        const rowHeight = 25;
        // EmpNo, Name, Type, Start, End, Desc
        const colWidths = [60, 100, 70, 70, 70, 150];
        const headers = ["Emp ID", "Name", "Type", "Start", "End", "Description"];

        // Draw Table Header
        const drawTableHeader = (y) => {
          let x = startX;
          doc.fontSize(9).font("Helvetica-Bold");

          headers.forEach((header, i) => {
            doc.rect(x, y, colWidths[i], rowHeight).fill("#4F81BD").stroke();
            doc.fillColor("white").text(header, x + 2, y + 8, { width: colWidths[i] - 4, align: "center" });
            x += colWidths[i];
          });
          doc.fillColor("black");
        };

        drawTableHeader(currentY);
        currentY += rowHeight;

        data.forEach((row, index) => {
          // Check for page break
          if (currentY + rowHeight > doc.page.height - 50) {
            doc.addPage();
            currentY = 50;
            drawTableHeader(currentY);
            currentY += rowHeight;
          }

          let x = startX;
          doc.fontSize(9).font("Helvetica");

          if (index % 2 === 1) {
            doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill("#F2F2F2");
          }

          doc.fillColor("black");

          const cellValues = [
            row.employeeNo,
            row.name.toUpperCase(),
            row.type,
            row.startDate,
            row.endDate,
            row.description
          ];

          cellValues.forEach((val, i) => {
            doc.rect(x, currentY, colWidths[i], rowHeight).stroke();
            // Truncate long descriptions
            // const text = i === 5 && val.length > 25 ? val.substring(0, 22) + "..." : val;
            doc.text(val, x + 2, currentY + 8, { width: colWidths[i] - 4, align: i === 1 || i === 5 ? "left" : "center", lineBreak: false });
            x += colWidths[i];
          });

          currentY += rowHeight;
        });

        doc.end();
        stream.on("finish", resolve);
        stream.on("error", reject);
      } catch (err) {
        reject(err);
      }
    });

    // --- Excel Generation ---
    const generateExcel = async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('On Duty Report');

      worksheet.columns = [
        { header: 'Employee No', key: 'employeeNo', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Type', key: 'type', width: 20 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'End Date', key: 'endDate', width: 15 },
        { header: 'Description', key: 'description', width: 40 }
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      };

      data.forEach(row => {
        worksheet.addRow({
          employeeNo: row.employeeNo,
          name: row.name.toUpperCase(),
          type: row.type,
          startDate: row.startDate,
          endDate: row.endDate,
          description: row.description
        });
      });

      await workbook.xlsx.writeFile(excelFilePath);
    };

    await Promise.all([generatePDF(), generateExcel()]);

    res.status(200).json({
      success: true,
      month: parseInt(month),
      year: parseInt(year),
      count: data.length,
      data: data,
      pdfDownloadUrl: `/reports/${pdfFileName}`,
      excelDownloadUrl: `/reports/${excelFileName}`
    });

  } catch (error) {
    console.error('Error fetching institution OnDuty summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch OnDuty summary',
      error: error.message
    });
  }
};

export default {
  createOnDuty,
  getUserOnDuty,
  getInstitutionOnDuty,
  updateOnDuty,
  deleteOnDuty,
  uploadOnDutyExcel,
  downloadOnDutyTemplate,
  deleteOnDutyByDates,
  getInstitutionOnDutySummary
};