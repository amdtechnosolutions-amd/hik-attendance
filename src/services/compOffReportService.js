import moment from 'moment';

export async function getCompOffStats(models, institutionId, userId, month, year) {
  try {
    const CompOff = models.CompOff;
    const Attendance = models.Attendance;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const earned = await CompOff.countDocuments({
      institutionId,
      userId,
      earnedDate: {
        $gte: startDate,
        $lte: endDate
      },
      status: { $in: ['available', 'used', 'cancelled'] }
    });

    const used = await CompOff.countDocuments({
      institutionId,
      userId,
      usedDate: {
        $gte: startDate,
        $lte: endDate
      },
      status: 'used'
    });

    const available = await CompOff.countDocuments({
      institutionId,
      userId,
      status: 'available'
    });

    const cancelled = await CompOff.countDocuments({
      institutionId,
      userId,
      earnedDate: {
        $gte: startDate,
        $lte: endDate
      },
      status: 'cancelled'
    });

    const daysUsedCompOff = await Attendance.countDocuments({
      institutionId,
      userId,
      usedCompOff: true,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    return {
      month,
      year,
      earned,
      used,
      available,
      cancelled,
      balance: available,
      daysUsedCompOff
    };
  } catch (error) {
    console.error('Error calculating CompOff stats:', error);
    throw error;
  }
}

export async function getUserCompOffDetailsForMonth(models, institutionId, userId, month, year) {
  try {
    const CompOff = models.CompOff;
    const Attendance = models.Attendance;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const compOffRecords = await CompOff.find({
      institutionId,
      userId,
      $or: [
        { earnedDate: { $gte: startDate, $lte: endDate } },
        { usedDate: { $gte: startDate, $lte: endDate } }
      ]
    }).select('earnedDate usedDate status reason earningType holidayDate');

    const attendanceWithCompOff = await Attendance.find({
      institutionId,
      userId,
      usedCompOff: true,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).select('date compOffNote');

    return {
      month,
      year,
      compOffEarned: compOffRecords.filter(c => c.earnedDate),
      compOffUsed: compOffRecords.filter(c => c.status === 'used'),
      attendanceDaysWithCompOff: attendanceWithCompOff
    };
  } catch (error) {
    console.error('Error fetching CompOff details:', error);
    throw error;
  }
}

export default {
  getCompOffStats,
  getUserCompOffDetailsForMonth
};
