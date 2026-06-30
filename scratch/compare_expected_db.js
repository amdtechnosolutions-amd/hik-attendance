import fs from 'fs';
import moment from 'moment';

const dbStatus = JSON.parse(fs.readFileSync('db_june_status.json', 'utf8'));

// Transcribed non-present statuses from the spreadsheet image
const specialStatus = {
  "001": { "2026-06-12": "L", "2026-06-18": "L", "2026-06-19": "L" },
  "083": { "2026-06-01": "OD", "2026-06-02": "OD", "2026-06-08": "OD", "2026-06-09": "OD", "2026-06-16": "OD" },
  "002": { "2026-06-18": "L", "2026-06-19": "L" },
  "003": { "2026-06-12": "L", "2026-06-16": "OD", "2026-06-18": "L", "2026-06-19": "L" },
  "004": { "2026-06-05": "A", "2026-06-09": "OD", "2026-06-16": "OD" }, // 05 is blank
  "005": { "2026-06-17": "OD", "2026-06-19": "L" },
  "91": { "2026-06-01": "OD" },
  "013": { "2026-06-01": "OD", "2026-06-05": "L" },
  "014": { "2026-06-18": "L" },
  "016": { "2026-06-15": "OD" },
  "058": { "2026-06-06": "L", "2026-06-08": "L", "2026-06-18": "L", "2026-06-19": "L" },
  "021": { "2026-06-16": "OD", "2026-06-17": "L" },
  "024": { "2026-06-08": "OD" },
  "92": { "2026-06-02": "OD" },
  "026": { "2026-06-15": "OD", "2026-06-18": "L" },
  "028": { "2026-06-18": "L" },
  "029": { "2026-06-02": "OD", "2026-06-18": "L" },
  "030": { "2026-06-02": "OD", "2026-06-18": "L" },
  "031": { "2026-06-06": "L", "2026-06-17": "L", "2026-06-18": "L" },
  "032": {
    "2026-06-02": "L",
    "2026-06-08": "L", "2026-06-09": "L", "2026-06-10": "L", "2026-06-11": "L", "2026-06-12": "L",
    "2026-06-15": "L", "2026-06-16": "L", "2026-06-17": "L", "2026-06-18": "L", "2026-06-19": "L"
  },
  "033": {
    "2026-06-01": "MTL", "2026-06-02": "MTL", "2026-06-03": "MTL", "2026-06-04": "MTL", "2026-06-05": "MTL", "2026-06-06": "MTL",
    "2026-06-08": "MTL", "2026-06-09": "MTL", "2026-06-10": "MTL", "2026-06-11": "MTL", "2026-06-12": "MTL",
    "2026-06-15": "MTL", "2026-06-16": "MTL", "2026-06-17": "MTL", "2026-06-18": "MTL", "2026-06-19": "MTL"
  },
  "036": { "2026-06-10": "OD" },
  "039": {
    "2026-06-15": "L", "2026-06-16": "L", "2026-06-17": "L", "2026-06-18": "L", "2026-06-19": "L"
  },
  "040": { "2026-06-11": "L" },
  "043": { "2026-06-09": "OD" },
  "044": { "2026-06-10": "OD", "2026-06-11": "OD" },
  "046": { "2026-06-09": "L", "2026-06-17": "OD" },
  "047": { "2026-06-01": "L", "2026-06-02": "L", "2026-06-10": "OD" },
  "052": { "2026-06-15": "OD" },
  "055": { "2026-06-09": "L", "2026-06-17": "OD" },
  "83": { "2026-06-02": "OD" },
  "113": { "2026-06-04": "L", "2026-06-05": "L", "2026-06-06": "L" },
  "109": { "2026-06-17": "OD" },
  "107": { "2026-06-08": "L", "2026-06-17": "L" },
  "115": { "2026-06-06": "L", "2026-06-16": "L", "2026-06-17": "L", "2026-06-18": "L" },
  "114": { "2026-06-09": "L", "2026-06-10": "L", "2026-06-11": "L", "2026-06-16": "L", "2026-06-17": "L", "2026-06-18": "L" },
  "066": { "2026-06-18": "L" },
  "060": { "2026-06-09": "L" },
  "090": { "2026-06-08": "L" },
  "095": { "2026-06-18": "L" },
  "065": { "2026-06-16": "OD", "2026-06-17": "OD", "2026-06-18": "L" },
  "117": { "2026-06-09": "L", "2026-06-18": "L", "2026-06-19": "L" },
  "017": { "2026-06-19": "OD" },
  "070": { "2026-06-04": "L", "2026-06-06": "L", "2026-06-09": "P/L" },
  "073": { "2026-06-17": "L" },
  "077": { "2026-06-01": "L", "2026-06-02": "L", "2026-06-03": "L" },
  "081": { "2026-06-06": "L", "2026-06-19": "L" },
  "122": { "2026-06-18": "L" },
  "97": { "2026-06-01": "L/M" }
};

const sundays = ["2026-06-07", "2026-06-14"];
const secondSaturdays = ["2026-06-13"];

const mismatches = [];

Object.keys(dbStatus).forEach((empId) => {
  const user = dbStatus[empId];
  const name = user.name;

  for (let day = 1; day <= 19; day++) {
    const dateStr = `2026-06-${String(day).padStart(2, '0')}`;

    if (sundays.includes(dateStr) || secondSaturdays.includes(dateStr)) {
      continue;
    }

    // Determine expected status
    let expected = "P"; // Default is PRESENT
    if (specialStatus[empId] && specialStatus[empId][dateStr]) {
      expected = specialStatus[empId][dateStr];
    }

    const dbVal = user.daily[dateStr];

    // We check for missed punches: expected "P" or "OD" or "L/M" or "P/L", but DB has "A"
    // Wait! Let's check for any general mismatch:
    if (expected === "P" && dbVal === "A") {
      mismatches.push({
        employeeNo: `MNCVV-${empId}`,
        name: name,
        date: dateStr,
        expected: "PRESENT",
        dbStatus: "ABSENT (No Punch)"
      });
    } else if ((expected === "OD" || expected === "L" || expected === "MTL" || expected === "P/L" || expected === "L/M") && dbVal === "A") {
      // Wait, is it a missed punch if they are on Leave/OD but DB says Absent?
      // For OD and Leave, if the DB says Absent, it means the OD/Leave record is missing in the database!
      // But we just inserted the OD and Leave records in the previous steps. Let's see if those are still missing or if they show up correctly.
      // Since we updated them in the DB in our previous scripts, they should now show up correctly (as "OD" or "L").
      // Let's see what mismatches exist!
      mismatches.push({
        employeeNo: `MNCVV-${empId}`,
        name: name,
        date: dateStr,
        expected: expected,
        dbStatus: dbVal
      });
    } else if (expected === "P" && dbVal === "HD") {
      // Expected full day Present, but DB says Half Day
      mismatches.push({
        employeeNo: `MNCVV-${empId}`,
        name: name,
        date: dateStr,
        expected: "PRESENT (Full Day)",
        dbStatus: "HALF DAY (Missed Check-In or Check-Out)"
      });
    }
  }
});

console.log("=== Discrepancies (Missed Punches & Missing Records) ===");
console.log(`Total discrepancies found: ${mismatches.length}`);
console.log(JSON.stringify(mismatches, null, 2));
