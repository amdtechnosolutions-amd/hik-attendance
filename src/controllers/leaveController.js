import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import moment from 'moment';
import PDFDocument from "pdfkit";

export const createLeave = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const Leave = models.Leave;
    const User = models.User;

    const { userId, leaveDate, type, reason } = req.body;

    if (!userId || !leaveDate || !type || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, leaveDate, type, reason'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const leave = new Leave({
      institutionId,
      userId,
      employeeNo: user.employeeNo,
      leaveDate: new Date(leaveDate),
      type,
      reason,
      status: 'pending'
    });

    await leave.save();

    res.status(201).json({
      success: true,
      message: 'Leave request created successfully',
      data: leave
    });
  } catch (error) {
    console.error('Error creating leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create leave request',
      error: error.message
    });
  }
};

export const getLeaveRequests = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const Leave = models.Leave;
    const { userId, status, startDate, endDate } = req.query;

    let query = { institutionId };

    if (userId) query.userId = userId;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.leaveDate = {};
      if (startDate) {
        query.leaveDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.leaveDate.$lte = new Date(endDate);
      }
    }

    const leaves = await Leave.find(query)
      .populate('userId', 'name employeeNo')
      .populate('approvedBy', 'name employeeNo')
      .sort({ leaveDate: -1 });

    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
};

export const getUserLeaves = async (req, res) => {
  try {
    const { institutionId, userId } = req.params;
    const { models } = req.institutionDb;
    const Leave = models.Leave;

    const leaves = await Leave.find({ institutionId, userId })
      .populate('userId', 'name employeeNo')
      .populate('approvedBy', 'name employeeNo')
      .sort({ leaveDate: -1 });

    res.status(200).json({
      success: true,
      data: leaves
    });
  } catch (error) {
    console.error('Error fetching user leaves:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user leaves',
      error: error.message
    });
  }
};

export const approveLeave = async (req, res) => {
  try {
    const { institutionId, leaveId } = req.params;
    const { models } = req.institutionDb;
    const Leave = models.Leave;
    const { comments } = req.body;
    const approverId = req.user.id;

    const leave = await Leave.findOneAndUpdate(
      { _id: leaveId, institutionId },
      {
        status: 'approved',
        approvedBy: approverId,
        approvalDate: new Date(),
        comments,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name employeeNo')
      .populate('approvedBy', 'name employeeNo');

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Leave approved successfully',
      data: leave
    });
  } catch (error) {
    console.error('Error approving leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve leave',
      error: error.message
    });
  }
};

export const rejectLeave = async (req, res) => {
  try {
    const { institutionId, leaveId } = req.params;
    const { models } = req.institutionDb;
    const Leave = models.Leave;
    const { comments } = req.body;
    const approverId = req.user.id;

    const leave = await Leave.findOneAndUpdate(
      { _id: leaveId, institutionId },
      {
        status: 'rejected',
        approvedBy: approverId,
        approvalDate: new Date(),
        comments,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name employeeNo')
      .populate('approvedBy', 'name employeeNo');

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Leave rejected successfully',
      data: leave
    });
  } catch (error) {
    console.error('Error rejecting leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject leave',
      error: error.message
    });
  }
};

export const deleteLeave = async (req, res) => {
  try {
    const { institutionId, leaveId } = req.params;
    const { models } = req.institutionDb;
    const Leave = models.Leave;

    const leave = await Leave.findOneAndDelete(
      { _id: leaveId, institutionId }
    );

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Leave deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting leave:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete leave',
      error: error.message
    });
  }
};

export const downloadLeaveTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leaves');

    worksheet.columns = [
      { header: 'EmployeeNo', key: 'employeeNo', width: 15 },
      { header: 'LeaveDate (YYYY-MM-DD)', key: 'leaveDate', width: 20 },
      { header: 'Type (half-day-morning/half-day-afternoon)', key: 'type', width: 30 },
      { header: 'Reason', key: 'reason', width: 30 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="leave-template.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message
    });
  }
};

export const uploadLeaveExcel = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const Leave = models.Leave;
    const User = models.User;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const filePath = req.file.path;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    const requiredHeaders = ['EmployeeNo', 'LeaveDate', 'Type', 'Reason'];
    const headers = worksheet.getRow(1).values;

    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingHeaders.join(', ')}`
      });
    }

    const employeeNoIdx = headers.indexOf('EmployeeNo');
    const leaveDateIdx = headers.indexOf('LeaveDate');
    const typeIdx = headers.indexOf('Type');
    const reasonIdx = headers.indexOf('Reason');

    const results = { success: 0, failed: 0, errors: [] };
    const bulkPromises = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      try {
        const employeeNo = String(row.getCell(employeeNoIdx).value || '').trim();
        const leaveDateStr = String(row.getCell(leaveDateIdx).value || '').trim();
        const type = String(row.getCell(typeIdx).value || '').trim();
        const reason = String(row.getCell(reasonIdx).value || '').trim();

        if (!employeeNo || !leaveDateStr || !type || !reason) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Missing required fields`);
          return;
        }

        const leaveDate = moment(leaveDateStr, ['YYYY-MM-DD', 'DD-MM-YYYY']).toDate();
        if (isNaN(leaveDate.getTime())) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Invalid date format`);
          return;
        }

        if (!['half-day-morning', 'half-day-afternoon'].includes(type)) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Invalid type. Use half-day-morning or half-day-afternoon`);
          return;
        }

        const createPromise = User.findOne({ employeeNo })
          .then((user) => {
            if (!user) {
              results.failed++;
              results.errors.push(`Row ${rowNumber}: User not found for EmployeeNo ${employeeNo}`);
              return null;
            }
            return Leave.create({
              institutionId,
              userId: user._id,
              employeeNo: user.employeeNo,
              leaveDate,
              type,
              reason,
              status: 'pending'
            })
              .then(() => {
                results.success++;
              })
              .catch((err) => {
                results.failed++;
                results.errors.push(`Row ${rowNumber}: ${err.message}`);
              });
          })
          .catch((err) => {
            results.failed++;
            results.errors.push(`Row ${rowNumber}: Error finding user - ${err.message}`);
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
      message: `Upload completed. ${results.success} leaves created, ${results.failed} failed`,
      summary: results
    });
  } catch (error) {
    console.error('Error uploading leave Excel:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to process uploaded file',
      error: error.message
    });
  }
};

// PERMISSION ENDPOINTS
export const createPermission = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const Permission = models.Permission;
    const User = models.User;

    const { userId, permissionDate, type, reason } = req.body;

    if (!userId || !permissionDate || !type || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, permissionDate, type, reason'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const permission = new Permission({
      institutionId,
      userId,
      employeeNo: user.employeeNo,
      permissionDate: new Date(permissionDate),
      type,
      reason,
      status: 'pending'
    });

    await permission.save();

    res.status(201).json({
      success: true,
      message: 'Permission request created successfully',
      data: permission
    });
  } catch (error) {
    console.error('Error creating permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create permission request',
      error: error.message
    });
  }
};

export const getPermissionRequests = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const Permission = models.Permission;
    const { userId, status, startDate, endDate } = req.query;

    let query = { institutionId };

    if (userId) query.userId = userId;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.permissionDate = {};
      if (startDate) {
        query.permissionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.permissionDate.$lte = new Date(endDate);
      }
    }

    const permissions = await Permission.find(query)
      .populate('userId', 'name employeeNo')
      .populate('approvedBy', 'name employeeNo')
      .sort({ permissionDate: -1 });

    res.status(200).json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
      error: error.message
    });
  }
};

export const approvePermission = async (req, res) => {
  try {
    const { institutionId, permissionId } = req.params;
    const { models } = req.institutionDb;
    const Permission = models.Permission;
    const { comments } = req.body;
    const approverId = req.user.id;

    const permission = await Permission.findOneAndUpdate(
      { _id: permissionId, institutionId },
      {
        status: 'approved',
        approvedBy: approverId,
        approvalDate: new Date(),
        comments,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name employeeNo')
      .populate('approvedBy', 'name employeeNo');

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Permission request not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Permission approved successfully',
      data: permission
    });
  } catch (error) {
    console.error('Error approving permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve permission',
      error: error.message
    });
  }
};

export const rejectPermission = async (req, res) => {
  try {
    const { institutionId, permissionId } = req.params;
    const { models } = req.institutionDb;
    const Permission = models.Permission;
    const { comments } = req.body;
    const approverId = req.user.id;

    const permission = await Permission.findOneAndUpdate(
      { _id: permissionId, institutionId },
      {
        status: 'rejected',
        approvedBy: approverId,
        approvalDate: new Date(),
        comments,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name employeeNo')
      .populate('approvedBy', 'name employeeNo');

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Permission request not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Permission rejected successfully',
      data: permission
    });
  } catch (error) {
    console.error('Error rejecting permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject permission',
      error: error.message
    });
  }
};

export const deletePermission = async (req, res) => {
  try {
    const { institutionId, permissionId } = req.params;
    const { models } = req.institutionDb;
    const Permission = models.Permission;

    const permission = await Permission.findOneAndDelete(
      { _id: permissionId, institutionId }
    );

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Permission request not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete permission',
      error: error.message
    });
  }
};

export const downloadPermissionTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Permissions');

    worksheet.columns = [
      { header: 'EmployeeNo', key: 'employeeNo', width: 15 },
      { header: 'PermissionDate (YYYY-MM-DD)', key: 'permissionDate', width: 20 },
      { header: 'Type (1-hour-morning/1-hour-afternoon)', key: 'type', width: 30 },
      { header: 'Reason', key: 'reason', width: 30 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="permission-template.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate template',
      error: error.message
    });
  }
};

export const uploadPermissionExcel = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const Permission = models.Permission;
    const User = models.User;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const filePath = req.file.path;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    const requiredHeaders = ['EmployeeNo', 'PermissionDate', 'Type', 'Reason'];
    const headers = worksheet.getRow(1).values;

    const missingHeaders = requiredHeaders.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: `Missing required columns: ${missingHeaders.join(', ')}`
      });
    }

    const employeeNoIdx = headers.indexOf('EmployeeNo');
    const permissionDateIdx = headers.indexOf('PermissionDate');
    const typeIdx = headers.indexOf('Type');
    const reasonIdx = headers.indexOf('Reason');

    const results = { success: 0, failed: 0, errors: [] };
    const bulkPromises = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      try {
        const employeeNo = String(row.getCell(employeeNoIdx).value || '').trim();
        const permissionDateStr = String(row.getCell(permissionDateIdx).value || '').trim();
        const type = String(row.getCell(typeIdx).value || '').trim();
        const reason = String(row.getCell(reasonIdx).value || '').trim();

        if (!employeeNo || !permissionDateStr || !type || !reason) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Missing required fields`);
          return;
        }

        const permissionDate = moment(permissionDateStr, ['YYYY-MM-DD', 'DD-MM-YYYY']).toDate();
        if (isNaN(permissionDate.getTime())) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Invalid date format`);
          return;
        }

        if (!['1-hour-morning', '1-hour-afternoon'].includes(type)) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Invalid type. Use 1-hour-morning or 1-hour-afternoon`);
          return;
        }

        const createPromise = User.findOne({ employeeNo })
          .then((user) => {
            if (!user) {
              results.failed++;
              results.errors.push(`Row ${rowNumber}: User not found for EmployeeNo ${employeeNo}`);
              return null;
            }
            return Permission.create({
              institutionId,
              userId: user._id,
              employeeNo: user.employeeNo,
              permissionDate,
              type,
              reason,
              status: 'pending'
            })
              .then(() => {
                results.success++;
              })
              .catch((err) => {
                results.failed++;
                results.errors.push(`Row ${rowNumber}: ${err.message}`);
              });
          })
          .catch((err) => {
            results.failed++;
            results.errors.push(`Row ${rowNumber}: Error finding user - ${err.message}`);
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
      message: `Upload completed. ${results.success} permissions created, ${results.failed} failed`,
      summary: results
    });
  } catch (error) {
    console.error('Error uploading permission Excel:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Failed to process uploaded file',
      error: error.message
    });
  }
};

export const getInstitutionPermissionSummary = async (req, res) => {
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

    const startDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const endDate = new Date(parseInt(year, 10), parseInt(month, 10), 0);
    const monthName = startDate.toLocaleString('default', { month: 'long' });

    const Permission = connection.model('Permission');

    // Query permissions for the month
    const query = {
      institutionId,
      permissionDate: { $gte: startDate, $lte: endDate }
    };

    const permissions = await Permission.find(query)
      .populate('userId', 'name employeeNo')
      .sort({ permissionDate: 1 });

    const data = permissions.map(record => ({
      employeeNo: record.employeeNo,
      name: record.userId?.name || 'Unknown',
      date: moment(record.permissionDate).format('DD-MM-YYYY'),
      type: record.type,
      reason: record.reason || '-',
      status: record.status
    }));

    // Reports Directory
    const reportsDir = path.join(process.cwd(), "public", "reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const timestamp = Date.now();
    const pdfFileName = `permission_report_${institutionId}_${timestamp}.pdf`;
    const excelFileName = `permission_report_${institutionId}_${timestamp}.xlsx`;
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
        doc.fontSize(12).font("Helvetica").text(`Permission Report - ${monthName} ${year}`, 0, y, { align: "center", width: doc.page.width });
        doc.moveDown(2);

        // Table configuration
        const startX = 30;
        let currentY = doc.y + 20;
        const rowHeight = 25;
        // EmpNo, Name, Date, Type, Reason, Status
        const colWidths = [60, 100, 70, 90, 150, 60];
        const headers = ["Emp ID", "Name", "Date", "Type", "Reason", "Status"];

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
            row.date,
            row.type,
            row.reason,
            row.status
          ];

          cellValues.forEach((val, i) => {
            doc.rect(x, currentY, colWidths[i], rowHeight).stroke();
            doc.text(val, x + 2, currentY + 8, { width: colWidths[i] - 4, align: i === 1 || i === 4 ? "left" : "center", lineBreak: false });
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
      const worksheet = workbook.addWorksheet('Permission Report');

      worksheet.columns = [
        { header: 'Employee No', key: 'employeeNo', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Permission Date', key: 'date', width: 15 },
        { header: 'Type', key: 'type', width: 25 },
        { header: 'Reason', key: 'reason', width: 40 },
        { header: 'Status', key: 'status', width: 15 }
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
          date: row.date,
          type: row.type,
          reason: row.reason,
          status: row.status
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
    console.error('Error fetching institution Permission summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Permission summary',
      error: error.message
    });
  }
};

export const getInstitutionLeaveSummary = async (req, res) => {
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

    const startDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const endDate = new Date(parseInt(year, 10), parseInt(month, 10), 0);
    const monthName = startDate.toLocaleString('default', { month: 'long' });

    const Leave = connection.model('Leave');

    // Query leaves for the month
    const query = {
      institutionId,
      leaveDate: { $gte: startDate, $lte: endDate }
    };

    const leaves = await Leave.find(query)
      .populate('userId', 'name employeeNo')
      .sort({ leaveDate: 1 });

    const data = leaves.map(record => ({
      employeeNo: record.employeeNo,
      name: record.userId?.name || 'Unknown',
      date: moment(record.leaveDate).format('DD-MM-YYYY'),
      type: record.type,
      reason: record.reason || '-',
      status: record.status
    }));

    // Reports Directory
    const reportsDir = path.join(process.cwd(), "public", "reports");
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

    const timestamp = Date.now();
    const pdfFileName = `leave_report_${institutionId}_${timestamp}.pdf`;
    const excelFileName = `leave_report_${institutionId}_${timestamp}.xlsx`;
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
        doc.fontSize(12).font("Helvetica").text(`Leave Report - ${monthName} ${year}`, 0, y, { align: "center", width: doc.page.width });
        doc.moveDown(2);

        // Table configuration
        const startX = 30;
        let currentY = doc.y + 20;
        const rowHeight = 25;
        // EmpNo, Name, Date, Type, Reason, Status
        const colWidths = [60, 100, 70, 90, 150, 60];
        const headers = ["Emp ID", "Name", "Date", "Type", "Reason", "Status"];

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
            row.date,
            row.type,
            row.reason,
            row.status
          ];

          cellValues.forEach((val, i) => {
            doc.rect(x, currentY, colWidths[i], rowHeight).stroke();
            doc.text(val, x + 2, currentY + 8, { width: colWidths[i] - 4, align: i === 1 || i === 4 ? "left" : "center", lineBreak: false });
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
      const worksheet = workbook.addWorksheet('Leave Report');

      worksheet.columns = [
        { header: 'Employee No', key: 'employeeNo', width: 15 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Leave Date', key: 'date', width: 15 },
        { header: 'Type', key: 'type', width: 25 },
        { header: 'Reason', key: 'reason', width: 40 },
        { header: 'Status', key: 'status', width: 15 }
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
          date: row.date,
          type: row.type,
          reason: row.reason,
          status: row.status
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
    console.error('Error fetching institution Leave summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Leave summary',
      error: error.message
    });
  }
};

export default {
  createLeave,
  getLeaveRequests,
  getUserLeaves,
  approveLeave,
  rejectLeave,
  deleteLeave,
  downloadLeaveTemplate,
  uploadLeaveExcel,
  createPermission,
  getPermissionRequests,
  approvePermission,
  rejectPermission,
  deletePermission,
  downloadPermissionTemplate,
  uploadPermissionExcel,
  getInstitutionPermissionSummary,
  getInstitutionLeaveSummary
};
