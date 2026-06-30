// import ExcelJS from 'exceljs';

// async function buildAttendanceWorkbook(attendanceRows) {
//   const wb = new ExcelJS.Workbook();
//   const ws = wb.addWorksheet('Attendance');
//   ws.addRow(['EmployeeNo', 'EventType', 'Timestamp', 'DeviceId', 'RawJSON']);

//   attendanceRows.forEach(r => {
//     ws.addRow([r.employeeNo, r.eventType, r.timestamp?.toISOString(), r.deviceId?.toString(), JSON.stringify(r.raw || {}) ]);
//   });

//   const buffer = await wb.xlsx.writeBuffer();
//   return buffer;
// }

// export default { buildAttendanceWorkbook };

import ExcelJS from 'exceljs';
import moment from 'moment';

export async function buildAttendanceWorkbook(records, onDutyRecords = []) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Attendance');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Employee No', key: 'employeeNo', width: 15 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'In Time', key: 'inTime', width: 15 },
    { header: 'Out Time', key: 'outTime', width: 15 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'On Duty Description', key: 'onDutyDescription', width: 30 }
  ];

  // Create a map of on-duty records for quick lookup
  const onDutyMap = {};
  
  // Process on-duty records if provided
  if (onDutyRecords && onDutyRecords.length > 0) {
    onDutyRecords.forEach(duty => {
      const startDate = moment(duty.startDate).startOf('day');
      const endDate = moment(duty.endDate).startOf('day');
      const currentDate = moment(startDate);
      
      // For each day in the on-duty period
      while (currentDate.isSameOrBefore(endDate)) {
        const dateKey = currentDate.format('YYYY-MM-DD');
        const empKey = `${duty.employeeNo}_${dateKey}`;
        
        onDutyMap[empKey] = {
          description: duty.description,
          startDate: duty.startDate,
          endDate: duty.endDate
        };
        
        currentDate.add(1, 'day');
      }
    });
  }

  // Group by employee + date
  const grouped = {};

  for (const r of records) {
    const dateKey = moment(r.timestamp).format('YYYY-MM-DD');
    const empKey = `${r.employeeNo}_${dateKey}`;

    if (!grouped[empKey]) {
      grouped[empKey] = {
        date: dateKey,
        employeeNo: r.employeeNo,
        name: r.raw?.name || '',
        inTime: r.timestamp,
        outTime: r.timestamp,
        status: 'Present',
        onDutyDescription: ''
      };
    } else {
      if (r.timestamp < grouped[empKey].inTime) grouped[empKey].inTime = r.timestamp;
      if (r.timestamp > grouped[empKey].outTime) grouped[empKey].outTime = r.timestamp;
    }
    
    // Check if this employee is on duty for this date
    if (onDutyMap[empKey]) {
      grouped[empKey].status = 'On Duty';
      grouped[empKey].onDutyDescription = onDutyMap[empKey].description;
    }
  }
  
  // Add on-duty records that don't have attendance records
  Object.keys(onDutyMap).forEach(empKey => {
    if (!grouped[empKey]) {
      const [employeeNo, dateKey] = empKey.split('_');
      grouped[empKey] = {
        date: dateKey,
        employeeNo: employeeNo,
        name: '', // We don't have the name without an attendance record
        inTime: null,
        outTime: null,
        status: 'On Duty',
        onDutyDescription: onDutyMap[empKey].description
      };
    }
  });

  // Add rows
  Object.values(grouped).forEach(item => {
    sheet.addRow({
      date: item.date,
      employeeNo: item.employeeNo,
      name: item.name,
      inTime: item.inTime ? moment(item.inTime).format('HH:mm:ss') : 'N/A',
      outTime: item.outTime ? moment(item.outTime).format('HH:mm:ss') : 'N/A',
      status: item.status,
      onDutyDescription: item.onDutyDescription
    });
  });
  
  // Apply conditional formatting for On Duty rows
  sheet.eachRow((row, rowIndex) => {
    if (rowIndex > 1) { // Skip header row
      const status = row.getCell('status').value;
      if (status === 'On Duty') {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE6F0FF' } // Light blue background
          };
        });
      }
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
