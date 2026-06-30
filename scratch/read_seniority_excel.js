import ExcelJS from 'exceljs';
import path from 'path';

async function run() {
  const filePath = path.resolve('seniorityUpload.xlsx');
  console.log('Reading Excel:', filePath);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  console.log('Worksheet name:', worksheet.name);

  // Print first 100 rows
  worksheet.eachRow((row, rowNumber) => {
    console.log(`Row ${rowNumber}:`, row.values.slice(1));
  });
}

run().catch(console.error);
