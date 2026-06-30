
import mongoose from 'mongoose';
import moment from 'moment-timezone';

// Mock user and data
const user = { employeeNo: '033' };
const attendance = { firstCheckIn: new Date() };

// Test Case 1: Within Range (Jan 31 2026)
let formattedDate = '2026-01-31';
let userLogic = (dateStr) => {
    let leaveStatus = null;
    let leaveType = null; // assume map failed
    let att = attendance;
    let status = "A";

    // Logic from Controller
    if (leaveType) {
        leaveStatus = "MTL";
    } else if (user.employeeNo.includes('033')) {
        const reportDate = moment(dateStr, "YYYY-MM-DD");
        const start = moment("2026-01-07", "YYYY-MM-DD");
        const end = moment("2026-07-07", "YYYY-MM-DD");
        if (reportDate.isBetween(start, end, 'day', '[]')) {
            leaveStatus = "MTL";
        }
    }

    if (leaveStatus) status = leaveStatus;
    else if (att) status = "P";

    return status;
};

console.log(`Jan 31 2026: ${userLogic('2026-01-31')}`); // Expect MTL
console.log(`Dec 01 2025: ${userLogic('2025-12-01')}`); // Expect P
