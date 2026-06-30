import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = 'ves_mncvv';
let mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
mongoUri = mongoUri.replace(/\/[^/?]+(\?|$)/, `/${DB_NAME}$1`);

async function run() {
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  console.log(`Connected to ${DB_NAME}`);

  try {
    const Attendance = conn.model('Attendance', new mongoose.Schema({}, { strict: false }), 'attendances');
    const totalRecords = await Attendance.countDocuments({});
    console.log('Total Attendance Records:', totalRecords);

    if (totalRecords === 0) {
      console.log('No records found.');
      return;
    }

    const uniqueDates = await Attendance.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp", timezone: "+05:30" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    console.log('Unique Dates (IST) and Record Counts:');
    uniqueDates.forEach(d => {
      console.log(`  Date: ${d._id} -> Count: ${d.count}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await conn.close();
  }
}

run();
