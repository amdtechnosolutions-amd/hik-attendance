import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define Institution Schema
const institutionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    shortName: { type: String, required: true },
    dbName: { type: String },
    dbCreated: { type: Boolean, default: false }
});

const Institution = mongoose.model('Institution', institutionSchema);

// Define Schemas
const userSchema = new mongoose.Schema({
    employeeNo: String,
    name: String
});

const compOffSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    employeeNo: String,
    earnedDate: Date,
    holidayDate: Date,
    status: String,
    usedDate: Date,
    usedInAttendanceId: mongoose.Schema.Types.ObjectId,
    notes: String,
    createdAt: Date,
    updatedAt: Date
});

const attendanceSchema = new mongoose.Schema({
    employeeNo: String,
    date: Date,
    usedCompOff: Boolean,
    compOffId: mongoose.Schema.Types.ObjectId
});

async function main() {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI not found in environment');
            process.exit(1);
        }

        console.log('Connecting to Master DB...');
        const masterConn = await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const institutions = await Institution.find({});
        console.log(`Found ${institutions.length} institutions.`);

        for (const inst of institutions) {
            console.log(`\nChecking Institution: ${inst.name} (${inst.shortName})`);

            if (!inst.dbCreated) {
                console.log(' - DB not created, skipping.');
                continue;
            }

            const dbName = inst.dbName || `ves_${inst.shortName.toLowerCase()}`;
            const uriParts = process.env.MONGO_URI.split('?');
            const baseUrl = uriParts[0];
            const queryParams = uriParts.length > 1 ? `?${uriParts[1]}` : '';
            const newBaseUrl = baseUrl.replace(/\/[^/]*$/, `/${dbName}`);
            const tenantUri = `${newBaseUrl}${queryParams}`;

            console.log(` - Connecting to tenant DB: ${dbName}`);
            const tenantConn = await mongoose.createConnection(tenantUri).asPromise();

            const User = tenantConn.model('User', userSchema);
            const CompOff = tenantConn.model('CompOff', compOffSchema);
            const Attendance = tenantConn.model('Attendance', attendanceSchema);

            // 1. Search for ANY Attendance with usedCompOff = true on 15-12-2025
            const attendanceQueryDate = new Date('2025-12-15');
            const attStart = new Date(attendanceQueryDate); attStart.setDate(attStart.getDate() - 1);
            const attEnd = new Date(attendanceQueryDate); attEnd.setDate(attEnd.getDate() + 2);

            const allCompOffAttendances = await Attendance.find({
                date: { $gte: attStart, $lt: attEnd },
                usedCompOff: true
            });

            if (allCompOffAttendances.length > 0) {
                console.log(` - Found ${allCompOffAttendances.length} Attendance records with usedCompOff=true around 15-12-2025:`);
                allCompOffAttendances.forEach(att => {
                    console.log(`   User EmpNo: ${att.employeeNo}, Date: ${att.date.toISOString()}, CompOffId: ${att.compOffId}`);
                });
            } else {
                console.log(` - No Attendance records with usedCompOff=true found around 15-12-2025.`);
            }

            // 2. Search for ANY CompOffs created today
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const anyRecentCompOffs = await CompOff.find({
                createdAt: { $gte: todayStart }
            }).limit(5);

            if (anyRecentCompOffs.length > 0) {
                console.log(` - Found ${anyRecentCompOffs.length} CompOffs created TODAY (for any user):`);
                for (const co of anyRecentCompOffs) {
                    console.log(`   User ID: ${co.userId}, EmpNo: ${co.employeeNo}, Status: ${co.status}, CreatedAt: ${co.createdAt}`);
                }
            } else {
                console.log(` - No CompOffs created today.`);
            }

            // check specifically for 102
            const user = await User.findOne({ employeeNo: '102' });
            if (user) {
                console.log(` - Found User 102: ${user.name} (${user._id})`);
                // Check all CompOffs for this user
                const userCompOffs = await CompOff.find({ userId: user._id });
                if (userCompOffs.length > 0) {
                    console.log(`   - User has ${userCompOffs.length} CompOff records.`);
                    userCompOffs.forEach(co => {
                        console.log(`     ID: ${co._id}, Status: ${co.status}, Earned: ${co.holidayDate}, Used: ${co.usedDate}`);
                    });
                } else {
                    console.log(`   - User has NO CompOff records.`);
                }
            } else {
                console.log(' - User 102 not found in this institution.');
            }

            await tenantConn.close();
        }

        console.log('\nDone.');
        await mongoose.disconnect();

    } catch (err) {
        console.error(err);
    }
}

main();
