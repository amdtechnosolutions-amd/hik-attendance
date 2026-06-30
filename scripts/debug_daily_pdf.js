
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Leave from '../src/models/Leave.js';
import Attendance from '../src/models/Attendance.js';
import OnDuty from '../src/models/OnDuty.js';
import Institution from '../src/models/Institution.js';
import { getUsersWithDailyAttendanceList } from '../src/controllers/userController.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendance-db';

const mockRes = () => {
    const res = {};
    res.json = (data) => { return res; };
    res.status = (code) => { return res; };
    return res;
};

async function debugDaily() {
    try {
        await mongoose.connect(MONGO_URI);
        const user = await User.findOne({ employeeNo: /033/ });
        const institution = await Institution.findById(user.institutionId);

        const req = {
            params: { institutionId: user.institutionId.toString() },
            // Date: Jan 31
            query: { date: '2026-01-31', limit: '1000', generateReports: 'true' },
            institutionDb: {
                models: { User, Leave, Attendance, OnDuty },
                institution: institution
            }
        };

        const reportsDir = path.join(process.cwd(), "public", "reports");
        if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

        console.log('Triggering getUsersWithDailyAttendanceList for Jan 31...');
        await getUsersWithDailyAttendanceList(req, mockRes());

        // Wait for PDF generation
        console.log('Waiting for PDF generation...');
        await new Promise(r => setTimeout(r, 5000));

        const files = fs.readdirSync(reportsDir);
        const match = files.find(f => f.startsWith(`attendance_${user.institutionId}_2026-01-31`) && f.endsWith('.pdf'));

        if (match) {
            console.log(`PDF Generated: ${path.join(reportsDir, match)}`);
        } else {
            console.error('PDF NOT Generated');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

debugDaily();
