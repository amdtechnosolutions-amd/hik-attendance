import fs from 'fs';
import * as pdfNode from 'pdf-parse/node';

console.log('pdf-parse/node exports:', Object.keys(pdfNode));

const pdfPath = '/home/amdtechno/projects/hik-attendance/public/reports/test_attendance_sig.pdf';
const dataBuffer = fs.readFileSync(pdfPath);

// Let's see if there is a parsing function
if (typeof pdfNode.pdf2text === 'function') {
  console.log('Found pdf2text function!');
  pdfNode.pdf2text(dataBuffer).then(text => {
    console.log('Parsed text:', text);
  }).catch(err => console.error(err));
} else if (typeof pdfNode.PDFParse === 'function') {
  console.log('Found PDFParse class!');
  // Let's see how to use it
  const parser = new pdfNode.PDFParse();
  console.log('Parser instance methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
}
