import Device from '../models/Device.js';
import Attendance from '../models/Attendance.js';
import { fetchEvents, createHikvisionClient } from '../services/hikvisionService.js';
import { buildAttendanceWorkbook } from '../services/excelService.js';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import moment from 'moment';
import { processSyncJob, getJobStatus } from '../services/syncJobService.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// export async function syncFromDevice(req, res) {
export async function syncFromDevice(req, res) {
  const { institutionId } = req.params;
  const { deviceId, startTime, endTime, fullSync } = req.body;

  if (!mongoose.Types.ObjectId.isValid(deviceId)) {
    return res.status(400).json({ message: 'Invalid or missing deviceId' });
  }

  try {
    const { models } = req.institutionDb;

    const device = await models.Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const job = await models.SyncJob.create({
      institutionId,
      deviceId,
      startTime,
      endTime,
      fullSync: fullSync || false,
      status: 'pending'
    });

    console.log(`Queued sync job ${job._id} for device ${deviceId}`);
    
    setImmediate(async () => {
      try {
        const jobData = await models.SyncJob.findById(job._id);
        if (jobData) {
          await processSyncJob(jobData, models);
        }
      } catch (err) {
        console.error(`Error processing sync job ${job._id}:`, err);
      }
    });

    res.json({
      status: "queued",
      jobId: job._id,
      message: "Sync job has been queued. Check status with the jobId."
    });

  } catch (err) {
    console.error('Error queuing sync job:', err);
    res.status(500).json({ message: err.message });
  }
}

export async function exportAttendanceExcel(req, res) {
  const { institutionId } = req.params;
  const { from, to } = req.query;

  try {
    // Use institution-specific database models
    const { models } = req.institutionDb;

    const qry = { institutionId };
    if (from || to) qry.timestamp = {};
    if (from) qry.timestamp.$gte = new Date(from);
    if (to) qry.timestamp.$lte = new Date(to);

    // Query from institution-specific database
    const records = await models.Attendance.find(qry).lean();

    // Get On Duty records for the same period
    const onDutyQuery = { institutionId };
    if (from || to) {
      if (from) {
        onDutyQuery.endDate = { $gte: new Date(from) };
      }
      if (to) {
        onDutyQuery.startDate = { $lte: new Date(to) };
      }
    }

    // Get the OnDuty model from the institution database
    const OnDuty = models.OnDuty;
    let onDutyRecords = [];

    if (OnDuty) {
      try {
        onDutyRecords = await OnDuty.find(onDutyQuery).lean();
        console.log(`Found ${onDutyRecords.length} On Duty records for the period`);
      } catch (onDutyErr) {
        console.error('Error fetching On Duty records:', onDutyErr);
        // Continue without On Duty records if there's an error
      }
    }

    // Generate Excel buffer with attendance and on-duty records
    const buffer = await buildAttendanceWorkbook(records, onDutyRecords);

    // Create a temporary filename
    const fileName = `attendance_${institutionId}_${Date.now()}.xlsx`;
    const filePath = path.join('public', 'downloads', fileName); // Make sure folder exists

    // Ensure the directory exists
    const dir = path.join('public', 'downloads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save file to server
    fs.writeFileSync(filePath, buffer);

    // Send a downloadable link
    res.json({
      success: true,
      message: 'Excel generated successfully',
      downloadUrl: `/ downloads / ${fileName} `,
      onDutyRecordsIncluded: onDutyRecords.length
    });
  } catch (err) {
    console.error('Error exporting attendance Excel:', err);
    res.status(500).json({ message: err.message });
  }
}

// export async function exportAttendanceExcel(req, res) {
//   const { institutionId } = req.params;
//   const { from, to } = req.query;

//   const qry = { institutionId };
//   if (from || to) qry.timestamp = {};
//   if (from) qry.timestamp.$gte = new Date(from);
//   if (to) qry.timestamp.$lte = new Date(to);

//   const records = await Attendance.find(qry).lean();

//   const buffer = await buildAttendanceWorkbook(records);

//   res.setHeader(
//     'Content-Disposition',
//     `attachment; filename = attendance_${ institutionId }_${ Date.now() }.xlsx`
//   );
//   res.setHeader(
//     'Content-Type',
//     'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
//   );

//   res.send(buffer);
/**
 * Upload manual attendance records from Excel file to mark absent users as present
 * @param {Object} req - Express request object with file
 * @param {Object} res - Express response object
 * @returns {Object} - JSON response with upload results
 */
export const uploadManualAttendanceExcel = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const User = models.User;
    const Attendance = models.Attendance;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const filePath = req.file.path;
    console.log("📘 Reading Manual Attendance Excel:", filePath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    const totalRows = worksheet.rowCount;
    console.log("📄 Total Rows Found:", totalRows);

    // === REQUIRED HEADERS ===
    const requiredHeaders = ["EmployeeNo", "Date", "InTime", "OutTime", "Reason"];
    const optionalHeaders = ["AttendanceType"];
    const headers = worksheet.getRow(1).values;
    // Note: headers[0] is empty

    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingHeaders.join(", ")} `,
      });
    }

    // === HEADER INDEXES ===
    const employeeNoIdx = headers.indexOf("EmployeeNo");
    const dateIdx = headers.indexOf("Date");
    const inTimeIdx = headers.indexOf("InTime");
    const outTimeIdx = headers.indexOf("OutTime");
    const reasonIdx = headers.indexOf("Reason");
    const attendanceTypeIdx = headers.indexOf("AttendanceType"); // Optional column

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

    const getTimeFromCell = (cell) => {
      if (!cell || cell.value === undefined || cell.value === null) return "";

      let timeStr = "";
      if (cell.type === ExcelJS.ValueType.Date) {
        timeStr = moment(cell.value).format("HH:mm:ss");
      } else if (typeof cell.value === "string") {
        timeStr = cell.value.trim();
      } else if (cell.text) {
        timeStr = cell.text.trim();
      }

      return timeStr;
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
        const dateStr = getCellTextOrDate(row.getCell(dateIdx));
        const inTimeStr = getTimeFromCell(row.getCell(inTimeIdx));
        const outTimeStr = getTimeFromCell(row.getCell(outTimeIdx));
        const reason = (row.getCell(reasonIdx).text || "").trim();

        // Get attendance type if column exists (default to "FULL" if not specified)
        let attendanceType = "FULL";
        if (attendanceTypeIdx > 0) {
          const typeCell = row.getCell(attendanceTypeIdx);
          if (typeCell && typeCell.text) {
            const typeText = typeCell.text.trim().toUpperCase();
            if (["ML/P", "ML-P", "MLP"].includes(typeText)) {
              attendanceType = "ML/P"; // Morning Leave / Afternoon Present
            }
          }
        }

        console.log({ rowNumber, employeeNo, dateStr, inTimeStr, outTimeStr, reason, attendanceType });

        // Validate required fields
        if (!employeeNo) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Missing Employee No`);
          return;
        }

        if (!dateStr) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Missing Date for EmployeeNo ${employeeNo}`);
          return;
        }

        if (!inTimeStr || !outTimeStr) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Missing In Time or Out Time for EmployeeNo ${employeeNo}`);
          return;
        }

        // Parse date
        const date = moment(dateStr, ["YYYY-MM-DD", "DD-MM-YYYY"]).toDate();
        if (isNaN(date.getTime())) {
          results.failed++;
          results.errors.push(
            `Row ${rowNumber}: Invalid date format for EmployeeNo ${employeeNo}.Use YYYY - MM - DD`
          );
          return;
        }

        // Create in and out timestamps
        const inTimeParts = inTimeStr.split(':');
        const outTimeParts = outTimeStr.split(':');

        if (inTimeParts.length < 2 || outTimeParts.length < 2) {
          results.failed++;
          results.errors.push(
            `Row ${rowNumber}: Invalid time format for EmployeeNo ${employeeNo}.Use HH:MM or HH: MM: SS`
          );
          return;
        }

        const inDate = new Date(date);
        inDate.setHours(parseInt(inTimeParts[0], 10), parseInt(inTimeParts[1], 10), inTimeParts[2] ? parseInt(inTimeParts[2], 10) : 0);

        // Adjust check-in time if it's after 9:00 AM
        if (parseInt(inTimeParts[0], 10) >= 9) {
          // Set to a random time between 8:30 AM and 8:50 AM
          const randomMinute = Math.floor(Math.random() * 21) + 30; // Random minute between 30 and 50
          inDate.setHours(8, randomMinute, 0);
          console.log(`Row ${rowNumber}: Adjusted check -in time for ${employeeNo} from ${inTimeStr} to 08:${randomMinute}:00`);
        }

        const outDate = new Date(date);
        outDate.setHours(parseInt(outTimeParts[0], 10), parseInt(outTimeParts[1], 10), outTimeParts[2] ? parseInt(outTimeParts[2], 10) : 0);

        // Adjust check-out time if it's before 16:30 (4:30 PM)
        const fourThirtyPM = new Date(date);
        fourThirtyPM.setHours(16, 30, 0, 0);

        if (outDate < fourThirtyPM) {
          // Set to a random time after 16:30
          const randomMinute = Math.floor(Math.random() * 29) + 31; // Random minute between 31 and 59
          outDate.setHours(16, randomMinute, 0);
          console.log(`Row ${rowNumber}: Adjusted check - out time for ${employeeNo} from ${outTimeStr} to 16:${randomMinute}:00`);
        }

        if (inDate >= outDate) {
          results.failed++;
          results.errors.push(
            `Row ${rowNumber}: In time must be before out time for EmployeeNo ${employeeNo}`
          );
          return;
        }

        // === CREATE ATTENDANCE ENTRIES ===
        const createPromise = User.findOne({ employeeNo })
          .then((user) => {
            if (!user) {
              results.failed++;
              results.errors.push(`Row ${rowNumber}: User not found for EmployeeNo ${employeeNo}`);
              return null;
            }

            // Create check-in record
            const checkInPromise = Attendance.create({
              institutionId,
              userId: user._id,
              employeeNo: user.employeeNo,
              eventType: "manual-check-in",
              timestamp: inDate,
              raw: {
                name: user.name,
                manualReason: reason,
                manualEntry: true,
                attendanceType: attendanceType
              }
            });

            // Create check-out record
            const checkOutPromise = Attendance.create({
              institutionId,
              userId: user._id,
              employeeNo: user.employeeNo,
              eventType: "manual-check-out",
              timestamp: outDate,
              raw: {
                name: user.name,
                manualReason: reason,
                manualEntry: true,
                attendanceType: attendanceType
              }
            });

            return Promise.all([checkInPromise, checkOutPromise])
              .then(() => {
                results.success++;
              })
              .catch((err) => {
                results.failed++;
                results.errors.push(
                  `Row ${rowNumber}: Failed to create attendance records for ${employeeNo} - ${err.message}`
                );
              });
          })
          .catch((err) => {
            results.failed++;
            results.errors.push(`Row ${rowNumber}: Error finding user ${employeeNo} - ${err.message} `);
          });

        bulkPromises.push(createPromise);
      } catch (err) {
        results.failed++;
        results.errors.push(`Row ${rowNumber}: ${err.message} `);
      }
    });

    await Promise.all(bulkPromises);

    fs.unlinkSync(filePath);

    return res.status(200).json({
      success: true,
      message: `Upload completed.${results.success} attendance records created, ${results.failed} failed`,
      summary: results,
    });
  } catch (error) {
    console.error("❌ Error in uploadManualAttendanceExcel:", error);
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(500).json({
      success: false,
      message: "Failed to process uploaded Excel file",
      error: error.message,
    });
  }
};

/**
 * Download manual attendance template Excel file
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const downloadManualAttendanceTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Manual Attendance');

    // Add headers
    const headerRow = worksheet.addRow(['EmployeeNo', 'Date', 'InTime', 'OutTime', 'Reason']);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4F81BD' }
      };
      cell.alignment = { horizontal: 'center' };
    });

    // Add sample rows
    const today = moment().format('YYYY-MM-DD');
    worksheet.addRow(['EMP001', today, '09:00:00', '17:00:00', 'Biometric not working']);
    worksheet.addRow(['EMP002', today, '09:30:00', '17:30:00', 'Forgot to punch']);
    worksheet.addRow(['EMP003', today, '08:45:00', '16:45:00', 'System error']);

    // Set column widths
    worksheet.columns = [
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 30 }
    ];

    // Add instructions
    worksheet.addRow([]);
    worksheet.addRow(['Instructions:']);
    worksheet.addRow(['1. EmployeeNo: Faculty/Employee ID (e.g., EMP001)']);
    worksheet.addRow(['2. Date: Date in YYYY-MM-DD format (e.g., 2025-01-15)']);
    worksheet.addRow(['3. InTime: Check-in time in HH:MM:SS format (e.g., 09:00:00)']);
    worksheet.addRow(['4. OutTime: Check-out time in HH:MM:SS format (e.g., 17:00:00)']);
    worksheet.addRow(['5. Reason: Reason for manual attendance entry']);
    worksheet.addRow(['6. Do not modify the header row']);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Manual_Attendance_Template.xlsx"');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message
    });
  }
};

/**
 * Create a single manual attendance record
 * @param {Object} req - Express request object with body
 * @param {Object} res - Express response object
 */
export const createManualEntry = async (req, res) => {
  try {
    const { institutionId, employeeNo, date: dateStr, inTime: inTimeStr, outTime: outTimeStr, reason, attendanceType = "FULL" } = req.body;

    if (!institutionId || !employeeNo || !dateStr) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: institutionId, employeeNo, date" 
      });
    }

    if (!inTimeStr && !outTimeStr) {
      return res.status(400).json({ 
        success: false, 
        message: "At least one of inTime or outTime must be provided" 
      });
    }

    // Connect to institution database
    const { getInstitutionConnection, createInstitutionModels } = await import('../services/dbService.js');
    const connection = await getInstitutionConnection(institutionId);
    const models = createInstitutionModels(connection);
    const User = models.User;
    const Attendance = models.Attendance;

    const user = await User.findOne({ employeeNo });
    if (!user) {
      return res.status(404).json({ success: false, message: `User not found for EmployeeNo ${employeeNo}` });
    }

    // Parse date
    const date = moment(dateStr, ["YYYY-MM-DD", "DD-MM-YYYY"]).toDate();
    if (isNaN(date.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format. Use YYYY-MM-DD" });
    }

    const attendanceRecords = [];

    // Handle check-in
    if (inTimeStr) {
      const inTimeParts = inTimeStr.split(':');
      const inDate = new Date(date);
      inDate.setHours(parseInt(inTimeParts[0], 10), parseInt(inTimeParts[1], 10), inTimeParts[2] ? parseInt(inTimeParts[2], 10) : 0);

      // Auto-correction logic
      if (parseInt(inTimeParts[0], 10) >= 9) {
        const randomMinute = Math.floor(Math.random() * 21) + 30;
        inDate.setHours(8, randomMinute, 0);
      }
      
      attendanceRecords.push({
        institutionId,
        userId: user._id,
        employeeNo: user.employeeNo,
        eventType: "manual-check-in",
        timestamp: inDate,
        raw: {
          name: user.name,
          manualReason: reason,
          manualEntry: true,
          attendanceType: attendanceType
        }
      });
    }

    // Handle check-out
    if (outTimeStr) {
      const outTimeParts = outTimeStr.split(':');
      const outDate = new Date(date);
      outDate.setHours(parseInt(outTimeParts[0], 10), parseInt(outTimeParts[1], 10), outTimeParts[2] ? parseInt(outTimeParts[2], 10) : 0);

      const fourThirtyPM = new Date(date);
      fourThirtyPM.setHours(16, 30, 0, 0);
      if (outDate < fourThirtyPM) {
        const randomMinute = Math.floor(Math.random() * 29) + 31;
        outDate.setHours(16, randomMinute, 0);
      }
      
      attendanceRecords.push({
        institutionId,
        userId: user._id,
        employeeNo: user.employeeNo,
        eventType: "manual-check-out",
        timestamp: outDate,
        raw: {
          name: user.name,
          manualReason: reason,
          manualEntry: true,
          attendanceType: attendanceType
        }
      });
    }

    if (attendanceRecords.length === 0) {
      return res.status(400).json({ success: false, message: "No valid attendance data to log" });
    }

    // Bulk insert or individual inserts
    await Attendance.insertMany(attendanceRecords);

    console.log(`✅ Manual attendance (${attendanceRecords.length} records) logged for ${employeeNo} on ${dateStr}`);

    return res.status(201).json({
      success: true,
      message: `Manual attendance logged successfully for ${employeeNo}`
    });

  } catch (error) {
    console.error("❌ Error in createManualEntry:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to log manual attendance",
      error: error.message
    });
  }
};

/**
 * List manual attendance records for an institution
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const listManualAttendance = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { date, employeeNo, from, to, page = 1, limit = 10 } = req.query;
    const { models } = req.institutionDb;
    const Attendance = models.Attendance;

    const query = { 
      'raw.manualEntry': true 
    };

    if (employeeNo) query.employeeNo = employeeNo;
    
    if (date) {
      const startOfDay = moment(date).startOf('day').toDate();
      const endOfDay = moment(date).endOf('day').toDate();
      query.timestamp = { $gte: startOfDay, $lte: endOfDay };
    } else if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = moment(from).startOf('day').toDate();
      if (to) query.timestamp.$lte = moment(to).endOf('day').toDate();
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const { grouped } = req.query;

    if (grouped === 'true') {
      // Use aggregation for grouped view
      const pipeline = [
        { $match: query },
        {
          $group: {
            _id: {
              userId: '$userId',
              date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }
            },
            employeeNo: { $first: '$employeeNo' },
            name: { $first: '$raw.name' },
            inTime: {
              $min: {
                $cond: [{ $eq: ["$eventType", "manual-check-in"] }, "$timestamp", null]
              }
            },
            outTime: {
              $max: {
                $cond: [{ $eq: ["$eventType", "manual-check-out"] }, "$timestamp", null]
              }
            },
            reason: { $first: '$raw.manualReason' },
            attendanceType: { $first: '$raw.attendanceType' }
          }
        },
        { $sort: { '_id.date': -1, name: 1 } },
        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $skip: skip }, { $limit: parseInt(limit) }]
          }
        }
      ];

      const result = await Attendance.aggregate(pipeline);
      const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
      const records = result[0].data;

      return res.json({
        success: true,
        count: records.length,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        grouped: true,
        records
      });
    }

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      count: records.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      records
    });
  } catch (error) {
    console.error('Error listing manual attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a manual attendance record
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteManualAttendance = async (req, res) => {
  try {
    const { institutionId, id } = req.params;
    const { models } = req.institutionDb;
    const Attendance = models.Attendance;

    const result = await Attendance.findOneAndDelete({ 
      _id: id, 
      'raw.manualEntry': true 
    });

    if (!result) {
      return res.status(404).json({ 
        success: false, 
        message: "Manual attendance record not found or is not a manual entry" 
      });
    }

    console.log(`🗑️ Deleted manual attendance record ${id} for institution ${institutionId}`);

    res.json({ 
      success: true, 
      message: "Manual attendance record deleted successfully" 
    });
  } catch (error) {
    console.error('Error deleting manual attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export async function getSyncJobStatus(req, res) {
  try {
    const { institutionId } = req.params;
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'jobId query parameter is required'
      });
    }

    const { models } = req.institutionDb;
    const job = await models.SyncJob.findById(jobId).lean();

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Sync job not found'
      });
    }

    // Build a human-readable status message for the frontend to display
    let statusMessage = '';
    switch (job.status) {
      case 'pending':
        statusMessage = 'Sync job is queued and waiting to start...';
        break;
      case 'processing':
        const fetched = job.progress?.totalEvents ?? 0;
        statusMessage = `Syncing attendance records... ${fetched} events fetched so far.`;
        break;
      case 'completed':
        statusMessage = `Sync completed successfully. ${job.recordedCount ?? 0} attendance record(s) saved.`;
        break;
      case 'failed':
        statusMessage = job.error || 'Sync failed. Check device connectivity and credentials.';
        break;
      default:
        statusMessage = `Status: ${job.status}`;
    }

    res.json({
      success: true,
      status: job.status,
      statusMessage,
      recordedCount: job.recordedCount ?? 0,
      error: job.error ?? null,
      progress: job.progress ?? null,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      job
    });
  } catch (error) {
    console.error('Error fetching sync job status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sync job status',
      error: error.message
    });
  }
}

export default {
  syncFromDevice,
  getSyncJobStatus,
  exportAttendanceExcel,
  uploadManualAttendanceExcel,
  downloadManualAttendanceTemplate,
  createManualEntry,
  listManualAttendance,
  deleteManualAttendance
};