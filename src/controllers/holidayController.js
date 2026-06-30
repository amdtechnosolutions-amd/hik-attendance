/**
 * Holiday Management Controller
 * Handles CRUD operations for institution and emergency holidays
 */

export async function createHoliday(req, res) {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const { name, startDate, endDate, type, description, showInAttendance } = req.body;

    if (!name || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Name and startDate are required'
      });
    }

    // Parse dates in the institution's timezone to avoid shifting
    const timeZone = "Asia/Kolkata";
    const holidayEndDate = endDate || startDate;
    const start = moment.tz(startDate, timeZone).startOf('day').toDate();
    const end = moment.tz(holidayEndDate, timeZone).endOf('day').toDate();

    const holiday = await models.Holiday.create({
      institutionId,
      name,
      startDate: start,
      endDate: end,
      type: type || 'institution-holiday',
      description,
      showInAttendance: showInAttendance !== false,
      isActive: true,
      createdBy: req.user?.id
    });

    res.status(201).json({
      success: true,
      holiday
    });
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating holiday',
      error: error.message
    });
  }
}

export async function getHolidays(req, res) {
  try {
    const { institutionId } = req.params;
    const { models } = req.institutionDb;
    const { startDate, endDate, type, showOnly } = req.query;

    const query = {
      institutionId,
      isActive: true
    };

    if (startDate || endDate) {
      query.$and = [];
      if (startDate) {
        query.$and.push({ endDate: { $gte: new Date(startDate) } });
      }
      if (endDate) {
        query.$and.push({ startDate: { $lte: new Date(endDate) } });
      }
    }

    if (type) {
      query.type = type;
    }

    if (showOnly === 'true') {
      query.showInAttendance = true;
    }

    const holidays = await models.Holiday
      .find(query)
      .sort({ startDate: 1 })
      .lean();

    res.json({
      success: true,
      holidays,
      count: holidays.length
    });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching holidays',
      error: error.message
    });
  }
}

export async function getHolidayById(req, res) {
  try {
    const { institutionId, holidayId } = req.params;
    const { models } = req.institutionDb;

    const holiday = await models.Holiday.findOne({
      _id: holidayId,
      institutionId
    }).lean();

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    res.json({
      success: true,
      holiday
    });
  } catch (error) {
    console.error('Error fetching holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching holiday',
      error: error.message
    });
  }
}

export async function updateHoliday(req, res) {
  try {
    const { institutionId, holidayId } = req.params;
    const { models } = req.institutionDb;
    const { name, startDate, endDate, type, description, showInAttendance, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    const timeZone = "Asia/Kolkata";
    if (startDate) updateData.startDate = moment.tz(startDate, timeZone).startOf('day').toDate();
    if (endDate) updateData.endDate = moment.tz(endDate, timeZone).endOf('day').toDate();
    if (type) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (showInAttendance !== undefined) updateData.showInAttendance = showInAttendance;
    if (isActive !== undefined) updateData.isActive = isActive;
    updateData.updatedAt = new Date();

    const holiday = await models.Holiday.findOneAndUpdate(
      { _id: holidayId, institutionId },
      updateData,
      { new: true }
    ).lean();

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    res.json({
      success: true,
      holiday
    });
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating holiday',
      error: error.message
    });
  }
}

export async function deleteHoliday(req, res) {
  try {
    const { institutionId, holidayId } = req.params;
    const { models } = req.institutionDb;

    const holiday = await models.Holiday.findOneAndUpdate(
      { _id: holidayId, institutionId },
      { isActive: false, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!holiday) {
      return res.status(404).json({
        success: false,
        message: 'Holiday not found'
      });
    }

    res.json({
      success: true,
      message: 'Holiday deleted successfully',
      holiday
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting holiday',
      error: error.message
    });
  }
}

export default {
  createHoliday,
  getHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday
};
