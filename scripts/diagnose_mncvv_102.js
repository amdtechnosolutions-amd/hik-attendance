import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal Schemas
const userSchema = new mongoose.Schema({ employeeNo: String, name: String });
const compOffSchema = new mongoose.Schema({}, { strict: false });
const attendanceSchema = new mongoose.Schema({}, { strict: false });

async function main() {
    try {
        if (!process.env.MONGO_URI) {
            console.error('MONGO_URI not found');
            process.exit(1);
        }

        const dbName = 'ves_mncvv';
        const uriParts = process.env.MONGO_URI.split('?');
        const baseUrl = uriParts[0];
        const queryParams = uriParts.length > 1 ? `?${uriParts[1]}` : '';
        const newBaseUrl = baseUrl.replace(/\/[^/]*$/, `/${dbName}`);
        const tenantUri = `${newBaseUrl}${queryParams}`;

        console.log(`Connecting to ${dbName}...`);
        const conn = await mongoose.createConnection(tenantUri).asPromise();
        console.log('Connected.');

        const User = conn.model('User', userSchema);
        const Attendance = conn.model('Attendance', attendanceSchema);

        const user = await User.findOne({ employeeNo: '102' });
        if (user) {
            const targetStart = new Date('2025-12-15T00:00:00.000Z');
            const targetEnd = new Date('2025-12-15T23:59:59.999Z');

            const att = await Attendance.findOne({
                employeeNo: '102',
                date: { $gte: targetStart, $lte: targetEnd }
            });

            if (att) {
                console.log('\n--- Full Attendance Record for 2025-12-15 ---');
                console.log(JSON.stringify(att.toObject(), null, 2));
            } else {
                console.log('\n--- No Attendance Record found for 102 on 2025-12-15 ---');
            }
        } else {
            console.log('User 102 not found.');
        }

        await conn.close();
        console.log('\nDone.');
    } catch (err) {
        console.error(err);
    }
}

main();
