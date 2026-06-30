export const assignCompOffToFaculties = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const CompOff = models.CompOff;
    const User = models.User;

    const { employeeNumbers, holidayDate } = req.body;

    if (!employeeNumbers || !Array.isArray(employeeNumbers) || employeeNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid field: employeeNumbers (must be an array)'
      });
    }

    if (!holidayDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: holidayDate'
      });
    }

    const holidayDateObj = new Date(holidayDate);
    const results = { success: 0, failed: 0, errors: [] };
    const createdCompOffs = [];

    for (const employeeNo of employeeNumbers) {
      try {
        const user = await User.findOne({ employeeNo });
        if (!user) {
          results.failed++;
          results.errors.push(`Employee ${employeeNo} not found`);
          continue;
        }

        const compOff = new CompOff({
          institutionId,
          userId: user._id,
          employeeNo: user.employeeNo,
          earnedDate: new Date(),
          holidayDate: holidayDateObj,
          earningType: 'manual',
          reason: 'Worked on leave',
          status: 'available',
          createdBy: req.user?.id
        });

        await compOff.save();
        results.success++;
        createdCompOffs.push({
          _id: compOff._id,
          employeeNo: compOff.employeeNo,
          holidayDate: compOff.holidayDate
        });
      } catch (err) {
        results.failed++;
        results.errors.push(`Error for employee ${employeeNo}: ${err.message}`);
      }
    }

    res.status(201).json({
      success: true,
      message: `CompOff assigned successfully. ${results.success} created, ${results.failed} failed`,
      data: createdCompOffs
    });
  } catch (error) {
    console.error('Error assigning CompOff to faculties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign CompOff',
      error: error.message
    });
  }
};

export const getFacultyCompOffAssignments = async (req, res) => {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const CompOff = models.CompOff;
    const { employeeNumber, status } = req.query;

    let query = { institutionId };
    if (employeeNumber) query.employeeNo = employeeNumber;
    if (status) query.status = status;

    const compOffs = await CompOff.find(query)
      .populate('userId', 'name employeeNo')
      .sort({ earnedDate: -1 });

    res.status(200).json({
      success: true,
      data: compOffs,
      total: compOffs.length
    });
  } catch (error) {
    console.error('Error fetching faculty CompOff assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CompOff assignments',
      error: error.message
    });
  }
};

export const adjustCompOffAssignment = async (req, res) => {
  try {
    const { institutionId, compOffId } = req.params;
    const { models } = req.institutionDb;
    const CompOff = models.CompOff;

    const { usedDate, status } = req.body;

    const compOff = await CompOff.findOne({
      _id: compOffId,
      institutionId
    });

    if (!compOff) {
      return res.status(404).json({
        success: false,
        message: 'CompOff assignment not found'
      });
    }

    if (compOff.status === 'used') {
      return res.status(400).json({
        success: false,
        message: 'Cannot adjust CompOff that has been used'
      });
    }

    if (usedDate) compOff.usedDate = new Date(usedDate);
    if (status) compOff.status = status;

    compOff.updatedAt = new Date();
    await compOff.save();

    res.status(200).json({
      success: true,
      message: 'CompOff adjusted successfully',
      data: {
        _id: compOff._id,
        employeeNo: compOff.employeeNo,
        holidayDate: compOff.holidayDate,
        usedDate: compOff.usedDate,
        status: compOff.status
      }
    });
  } catch (error) {
    console.error('Error adjusting CompOff assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust CompOff assignment',
      error: error.message
    });
  }
};

export default {
  assignCompOffToFaculties,
  getFacultyCompOffAssignments,
  adjustCompOffAssignment
};
