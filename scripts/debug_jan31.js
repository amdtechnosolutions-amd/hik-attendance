
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Leave from '../src/models/Leave.js';
import Institution from '../src/models/Institution.js';
import dotenv from 'dotenv';
import moment from 'moment-timezone';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendance-db';

async function debugJan31() {
    try {
        await mongoose.connect(MONGO_URI);
        
        const user = await User.findOne({ employeeNo: /033/ });
        console.log(`Checking for User: ${user.name} (${user.employeeNo})`);

        // Replicate Controller Date Logic
        const date = '2026-01-31';
        const targetMoment = moment.tz(date, "Asia/Kolkata");
        const startOfDay = targetMoment.clone().startOf("day").toDate();
        const endOfDay = targetMoment.clone().endOf("day").toDate();

        console.log(`\nDate Query Parameters for ${date}:`);
        console.log(`Start: ${startOfDay.toISOString()}`);
        console.log(`End:   ${endOfDay.toISOString()}`);

        const leaveRecords = await Leave.find({
            institutionId: user.institutionId,
            status: "approved",
            leaveDate: { $gte: startOfDay, $lte: endOfDay }
        }).lean();

        console.log(`\nLeave Records Found: ${leaveRecords.length}`);
        leaveRecords.forEach(l => {
            console.log(`- Emp: ${l.employeeNo}, Type: ${l.type}, Date: ${l.leaveDate.toISOString()}`);
        });

        const myLeave = leaveRecords.find(l => l.employeeNo === user.employeeNo);
        if (myLeave) {
            console.log(`\nMATCH: leaveMap entry for 033 would be: ${myLeave.type}`);
        } else {
            console.log(`\nNO MATCH for 033 in retrieved records.`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

debugJan31();
