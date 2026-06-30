import fs from 'fs';

const pdfPath = '/home/amdtechno/projects/hik-attendance/public/reports/test_attendance_sig.pdf';
const content = fs.readFileSync(pdfPath, 'utf8');

// Regex to find all parentheses strings (e.g., (some text) Tj or Tj (some text))
const regex = /\(([^)]+)\)/g;
let match;
const strings = [];

while ((match = regex.exec(content)) !== null) {
  strings.push(match[1]);
}

console.log('Total text strings found in PDF:', strings.length);
console.log('First 50 strings:', strings.slice(0, 50));
console.log('Last 50 strings:', strings.slice(-50));

// Let's search if any string contains "SUJATHA" or "Principal"
const sujathaMatches = strings.filter(s => s.toLowerCase().includes('sujatha') || s.toLowerCase().includes('dolly'));
const sigMatches = strings.filter(s => s.toLowerCase().includes('principal') || s.toLowerCase().includes('signature'));

console.log('Matches for "sujatha":', sujathaMatches);
console.log('Matches for "signature":', sigMatches);
