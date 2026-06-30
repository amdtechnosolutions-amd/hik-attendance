import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Leave from '../src/models/Leave.js';
import dotenv from 'dotenv';
import moment from 'moment-timezone';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/attendance-db';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB');

    const user = await User.findOne({ employeeNo: '033' });
    if (!user) {
      console.log('User 033 not found');
      await mongoose.disconnect();
      return;
    }

    const start = new Date('2026-04-01T00:00:00Z');
    const end = new Date('2026-05-31T23:59:59Z');

    const leaves = await Leave.find({
      employeeNo: '033',
      leaveDate: { $gte: start, $lte: end }
    }).sort({ leaveDate: 1 });

    console.log(`Found ${leaves.length} leaves in April/May 2026:`);
    leaves.forEach(l => {
      const utcStr = l.leaveDate.toISOString();
      const localStr = moment(l.leaveDate).format('YYYY-MM-DD');
      const kolkataStr = moment(l.leaveDate).tz('Asia/Kolkata').format('YYYY-MM-DD');
      console.log(`UTC: ${utcStr} | Local: ${localStr} | Kolkata: ${kolkataStr} | Type: ${l.type} | Status: ${l.status}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
