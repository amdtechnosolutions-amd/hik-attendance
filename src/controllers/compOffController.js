import ExcelJS from 'exceljs';
import fs from 'fs';
import moment from 'moment';

export const createCompOffManual = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const CompOff = models.CompOff;
    const User = models.User;

    const { userId, holidayDate, reason } = req.body;

    if (!userId || !holidayDate || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: userId, holidayDate, reason' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const compOff = new CompOff({
      institutionId,
      userId,
      employeeNo: user.employeeNo,
      earnedDate: new Date(),
      holidayDate: new Date(holidayDate),
      earningType: 'manual',
      reason,
      status: 'available',
      createdBy: req.user?.id
    });

    await compOff.save();

    res.status(201).json({
      success: true,
      message: 'CompOff created successfully',
      data: compOff
    });
  } catch (error) {
    console.error('Error creating CompOff:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create CompOff',
      error: error.message 
    });
  }
};

export const createCompOffAutomatic = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const CompOff = models.CompOff;
    const User = models.User;

    const { userId, holidayDate } = req.body;

    if (!userId || !holidayDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: userId, holidayDate' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const compOff = new CompOff({
      institutionId,
      userId,
      employeeNo: user.employeeNo,
      earnedDate: new Date(),
      holidayDate: new Date(holidayDate),
      earningType: 'automatic',
      reason: 'Worked on holiday',
      status: 'available'
    });

    await compOff.save();

    res.status(201).json({
      success: true,
      message: 'CompOff created automatically',
      data: compOff
    });
  } catch (error) {
    console.error('Error creating automatic CompOff:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create CompOff',
      error: error.message 
    });
  }
};

export const getCompOffRecords = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const CompOff = models.CompOff;
    const { userId, status, startDate, endDate } = req.query;

    let query = { institutionId };

    if (userId) query.userId = userId;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.earnedDate = {};
      if (startDate) {
        query.earnedDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.earnedDate.$lte = new Date(endDate);
      }
    }

    const compOffs = await CompOff.find(query)
      .populate('userId', 'name employeeNo')
      .populate('createdBy', 'name employeeNo')
      .sort({ earnedDate: -1 });

    res.status(200).json({
      success: true,
      data: compOffs
    });
  } catch (error) {
    console.error('Error fetching CompOff records:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch CompOff records',
      error: error.message 
    });
  }
};

export const getUserCompOffBalance = async (req, res) => {
  try {
    const { institutionId, userId } = req.params;
    const { models } = req.institutionDb;
    const CompOff = models.CompOff;

    const available = await CompOff.countDocuments({
      institutionId,
      userId,
      status: 'available'
    });

    const used = await CompOff.countDocuments({
      institutionId,
      userId,
      status: 'used'
    });

    const cancelled = await CompOff.countDocuments({
      institutionId,
      userId,
      status: 'cancelled'
    });

    const balance = available;

    res.status(200).json({
      success: true,
      data: {
        userId,
        earned: available + used + cancelled,
        available,
        used,
        cancelled,
        balance
      }
    });
  } catch (error) {
    console.error('Error calculating CompOff balance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to calculate CompOff balance',
      error: error.message 
    });
  }
};

export const useCompOff = async (req, res) => {
  try {
    const { institutionId, compOffId } = req.params;
    const { models } = req.institutionDb;
    const CompOff = models.CompOff;
    const Attendance = models.Attendance;
    const { usedDate, notes } = req.body;

    if (!usedDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required field: usedDate' 
      });
    }

    const compOff = await CompOff.findOne({
      _id: compOffId,
      institutionId
    });

    if (!compOff) {
      return res.status(404).json({ success: false, message: 'CompOff record not found' });
    }

    if (compOff.status !== 'available') {
      return res.status(400).json({ 
        success: false, 
        message: `CompOff is already ${compOff.status}` 
      });
    }

    const usedDateObj = new Date(usedDate);
    
    // Find or create attendance record for this date
    let attendanceRecord = await Attendance.findOne({
      institutionId,
      employeeNo: compOff.employeeNo,
      date: {
        $gte: new Date(usedDateObj.getFullYear(), usedDateObj.getMonth(), usedDateObj.getDate()),
        $lt: new Date(usedDateObj.getFullYear(), usedDateObj.getMonth(), usedDateObj.getDate() + 1)
      }
    });

    if (!attendanceRecord) {
      attendanceRecord = new Attendance({
        institutionId,
        employeeNo: compOff.employeeNo,
        userId: compOff.userId,
        date: usedDateObj,
        usedCompOff: true,
        compOffId,
        compOffNote: notes,
        timestamp: usedDateObj
      });
      await attendanceRecord.save();
    } else {
      attendanceRecord.usedCompOff = true;
      attendanceRecord.compOffId = compOffId;
      attendanceRecord.compOffNote = notes;
      await attendanceRecord.save();
    }

    const updated = await CompOff.findByIdAndUpdate(
      compOffId,
      {
        status: 'used',
        usedDate: usedDateObj,
        usedInAttendanceId: attendanceRecord._id,
        notes,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name employeeNo')
     .populate('createdBy', 'name employeeNo');

    res.status(200).json({
      success: true,
      message: 'CompOff marked as used and linked to attendance',
      data: {
        compOff: updated,
        attendanceRecord
      }
    });
  } catch (error) {
    console.error('Error marking CompOff as used:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark CompOff as used',
      error: error.message 
    });
  }
};

export const cancelCompOff = async (req, res) => {
  try {
    const { institutionId, compOffId } = req.params;
    const { models } = req.institutionDb;
    const CompOff = models.CompOff;
    const { reason } = req.body;

    const compOff = await CompOff.findOne({
      _id: compOffId,
      institutionId
    });

    if (!compOff) {
      return res.status(404).json({ success: false, message: 'CompOff record not found' });
    }

    if (compOff.status === 'used') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel CompOff that has been used' 
      });
    }

    const updated = await CompOff.findByIdAndUpdate(
      compOffId,
      {
        status: 'cancelled',
        notes: reason,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('userId', 'name employeeNo')
     .populate('createdBy', 'name employeeNo');

    res.status(200).json({
      success: true,
      message: 'CompOff cancelled successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error cancelling CompOff:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to cancel CompOff',
      error: error.message 
    });
  }
};

export const deleteCompOff = async (req, res) => {
  try {
    const { institutionId, compOffId } = req.params;
    const { models } = req.institutionDb;
    const CompOff = models.CompOff;
    const Attendance = models.Attendance;

    const compOff = await CompOff.findOne({
      _id: compOffId,
      institutionId
    });

    if (!compOff) {
      return res.status(404).json({ success: false, message: 'CompOff record not found' });
    }

    if (compOff.usedInAttendanceId) {
      await Attendance.findByIdAndUpdate(
        compOff.usedInAttendanceId,
        {
          usedCompOff: false,
          compOffId: null,
          compOffNote: null
        },
        { new: true }
      );
    }

    await CompOff.findOneAndDelete({
      _id: compOffId,
      institutionId
    });

    res.status(200).json({
      success: true,
      message: 'CompOff deleted successfully and removed from attendance records'
    });
  } catch (error) {
    console.error('Error deleting CompOff:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete CompOff',
      error: error.message 
    });
  }
};

export const downloadCompOffTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CompOff');

    worksheet.columns = [
      { header: 'EmployeeNo', key: 'employeeNo', width: 15 },
      { header: 'HolidayDate (YYYY-MM-DD)', key: 'holidayDate', width: 20 },
      { header: 'Reason', key: 'reason', width: 30 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42B4E6' } };

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="compoff-template.xlsx"');
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

export const uploadCompOffExcel = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const CompOff = models.CompOff;
    const User = models.User;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    const filePath = req.file.path;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    const requiredHeaders = ['EmployeeNo', 'HolidayDate', 'Reason'];
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
    const holidayDateIdx = headers.indexOf('HolidayDate');
    const reasonIdx = headers.indexOf('Reason');

    const results = { success: 0, failed: 0, errors: [] };
    const bulkPromises = [];

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      try {
        const employeeNo = String(row.getCell(employeeNoIdx).value || '').trim();
        const holidayDateStr = String(row.getCell(holidayDateIdx).value || '').trim();
        const reason = String(row.getCell(reasonIdx).value || '').trim();

        if (!employeeNo || !holidayDateStr || !reason) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Missing required fields`);
          return;
        }

        const holidayDate = moment(holidayDateStr, ['YYYY-MM-DD', 'DD-MM-YYYY']).toDate();
        if (isNaN(holidayDate.getTime())) {
          results.failed++;
          results.errors.push(`Row ${rowNumber}: Invalid date format`);
          return;
        }

        const createPromise = User.findOne({ employeeNo })
          .then((user) => {
            if (!user) {
              results.failed++;
              results.errors.push(`Row ${rowNumber}: User not found for EmployeeNo ${employeeNo}`);
              return null;
            }
            return CompOff.create({
              institutionId,
              userId: user._id,
              employeeNo: user.employeeNo,
              earnedDate: new Date(),
              holidayDate,
              earningType: 'manual',
              reason,
              status: 'available'
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
      message: `Upload completed. ${results.success} CompOff created, ${results.failed} failed`,
      summary: results
    });
  } catch (error) {
    console.error('Error uploading CompOff Excel:', error);
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

export default {
  createCompOffManual,
  createCompOffAutomatic,
  getCompOffRecords,
  getUserCompOffBalance,
  useCompOff,
  cancelCompOff,
  deleteCompOff,
  downloadCompOffTemplate,
  uploadCompOffExcel
};
