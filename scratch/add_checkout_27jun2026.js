/**
 * add_checkout_27jun2026.js
 * ─────────────────────────────────────────────────────────────
 * Adds manual-check-out records for all employees who have
 * a manual-check-in today (27 Jun 2026) but NO check-out.
 *
 * Check-out time: 15:45 – 16:30 IST (random per employee)
 * 15:45 IST = 10:15 UTC
 * 16:30 IST = 11:00 UTC
 *
 * Run: node scratch/add_checkout_27jun2026.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMaster, getInstitutionConnection, createInstitutionModels } from '../src/services/dbService.js';

const INSTITUTION_ID = '68e0e148f633a16a99a9df2e';

// June 27 IST day window in UTC
const dayStart = new Date('2026-06-26T18:30:00Z');
const dayEnd   = new Date('2026-06-27T18:30:00Z');

// Random check-out: 15:45–16:30 IST stored as UTC
function randomCheckOut() {
  // totalMin from midnight: 15*60+45=945 to 16*60+30=990
  const totalMin = Math.floor(Math.random() * 46) + 945; // 945–990 min
  const h   = Math.floor(totalMin / 60);   // 15 or 16
  const min = totalMin % 60;
  const sec = Math.floor(Math.random() * 60);
  const istMidnight = new Date('2026-06-27T00:00:00+05:30').getTime();
  return new Date(istMidnight + h * 3600000 + min * 60000 + sec * 1000);
}

async function main() {
  await connectMaster();
  const conn   = await getInstitutionConnection(INSTITUTION_ID);
  const models = createInstitutionModels(conn);
  const { Attendance } = models;

  console.log('\n📅 Adding check-out records for 27-Jun-2026 (15:45–16:30 IST)\n');

  // Get all employees who have manual-check-in today
  const checkIns = await Attendance.find({
    institutionId:   INSTITUTION_ID,
    'raw.manualEntry': true,
    eventType:       'manual-check-in',
    timestamp:       { $gte: dayStart, $lt: dayEnd }
  }).lean();

  console.log(`📋 Manual check-ins found today: ${checkIns.length}`);

  let inserted = 0, skipped = 0, errors = 0;

  for (const rec of checkIns) {
    try {
      // Check if check-out already exists for this employee today
      const existing = await Attendance.findOne({
        employeeNo:      rec.employeeNo,
        'raw.manualEntry': true,
        eventType:       'manual-check-out',
        timestamp:       { $gte: dayStart, $lt: dayEnd }
      });

      if (existing) {
        console.log(`⏭️  ${rec.employeeNo} — check-out already exists, skipping`);
        skipped++;
        continue;
      }

      const checkOut = randomCheckOut();

      await Attendance.create({
        institutionId: INSTITUTION_ID,
        userId:        rec.userId,
        employeeNo:    rec.employeeNo,
        eventType:     'manual-check-out',
        timestamp:     checkOut,
        raw: {
          name:          rec.raw?.name,
          manualReason:  rec.raw?.manualReason || 'Manual entry 27-Jun-2026',
          manualEntry:   true,
          attendanceType: rec.raw?.attendanceType || 'FULL'
        }
      });

      // Display IST time
      const ist = new Date(checkOut.getTime() + 5.5 * 3600000);
      const hh  = String(ist.getUTCHours()).padStart(2, '0');
      const mm  = String(ist.getUTCMinutes()).padStart(2, '0');
      const ss  = String(ist.getUTCSeconds()).padStart(2, '0');
      console.log(`✅ ${rec.employeeNo.padEnd(5)} | ${(rec.raw?.name || '').padEnd(33)} | OUT: ${hh}:${mm}:${ss} IST`);
      inserted++;

    } catch (err) {
      console.error(`❌ ${rec.employeeNo} — ${err.message}`);
      errors++;
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`✅ Check-outs inserted : ${inserted}`);
  console.log(`⏭️  Skipped             : ${skipped}`);
  console.log(`❌ Errors              : ${errors}`);
  console.log('══════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
