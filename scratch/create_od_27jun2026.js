/**
 * create_od_27jun2026.js
 * Creates OD (On Duty) records for 4 employees on 27 June 2026
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMaster, getInstitutionConnection, createInstitutionModels } from '../src/services/dbService.js';

const INSTITUTION_ID = '68e0e148f633a16a99a9df2e';

const OD_EMPLOYEES = ['039', '054', '100', '120'];

// June 27 full day in IST
const startDate = new Date('2026-06-27T00:00:00+05:30'); // midnight IST
const endDate   = new Date('2026-06-27T23:59:59+05:30'); // end of day IST

async function main() {
  await connectMaster();
  const conn   = await getInstitutionConnection(INSTITUTION_ID);
  const models = createInstitutionModels(conn);
  const { User, OnDuty } = models;

  if (!OnDuty) {
    console.error('❌ OnDuty model not found in institution DB');
    process.exit(1);
  }

  console.log('\n📅 Creating OD records for 27-Jun-2026');
  console.log(`startDate (UTC): ${startDate.toISOString()}`);
  console.log(`endDate   (UTC): ${endDate.toISOString()}\n`);

  let inserted = 0;

  for (const empNo of OD_EMPLOYEES) {
    const user = await User.findOne({ employeeNo: empNo });
    if (!user) {
      console.warn(`⚠️  User not found: ${empNo}`);
      continue;
    }

    // Check if OD already exists for today
    const existing = await OnDuty.findOne({
      employeeNo: empNo,
      startDate: { $lte: endDate },
      endDate:   { $gte: startDate }
    });

    if (existing) {
      console.log(`⏭️  ${empNo} | ${user.name} — OD record already exists`);
      continue;
    }

    await OnDuty.create({
      institutionId: new mongoose.Types.ObjectId(INSTITUTION_ID),
      userId:        user._id,
      employeeNo:    user.employeeNo,
      startDate,
      endDate,
      description:   'On Duty – 27 Jun 2026',
      type:          'full-day',
      session:       'full'
    });

    console.log(`✅ OD created: ${empNo} | ${user.name}`);
    inserted++;
  }

  console.log(`\n══════════════════════════════════`);
  console.log(`✅ OD records created: ${inserted}`);

  // Verify
  const total = await OnDuty.countDocuments({
    startDate: { $lte: endDate },
    endDate:   { $gte: startDate }
  });
  console.log(`📋 Total OD records today: ${total}`);
  console.log('══════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
