/**
 * fix_attendance_27jun2026.js
 * ─────────────────────────────────────────────────────────────
 * Inserts manual check-in ONLY (no check-out) for MNCVV
 * employees present on 27-Jun-2026.
 * OD employees ARE included (physically present on duty).
 * Check-in time: 08:45 – 09:00 IST (random per employee)
 *
 * EXCLUDED (Absent/Leave):
 *   001, 003, 014, 058, 032, 040, 044, 046, 070
 *
 * Already have device records (skip):
 *   005, 009, 016, 021, 026, 043, 052, 073, 075, 102, 112, 81, 90, 94
 *
 * Run: node scratch/fix_attendance_27jun2026.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectMaster, getInstitutionConnection, createInstitutionModels } from '../src/services/dbService.js';

const INSTITUTION_ID = '68e0e148f633a16a99a9df2e';
const DATE_STR       = '2026-06-27';

// ── Absent / Leave — excluded completely ─────────────────────
const ABSENT = new Set(['001', '003', '014', '058', '032', '040', '044', '046', '070']);

// ── Already captured by device — skip ────────────────────────
const DEVICE_PRESENT = new Set(['005','009','016','021','026','043','052','073','075','102','112','81','90','94']);

// ── OD employees — INCLUDED (present on duty) ─────────────────
const OD = new Set(['039', '054', '100', '120']);

// ── Full employee list ────────────────────────────────────────
const ALL = [
  '001','002','003','004','005','006','009','013','014','016',
  '017','018','021','022','023','024','025','026','028','029',
  '030','031','032','033','036','038','039','040','041','043',
  '044','045','046','047','049','052','053','054','055','056',
  '058','059','060','064','065','066','067','070','073','075',
  '076','077','078','079','080','081','083','100','101','102',
  '104','107','108','109','111','112','113','114','115','116',
  '117','120','122','124','125','126',
  '81','82','83','87','90','91','92','94','95','97'
];

// Need manual check-in = not absent and not already recorded
const TO_INSERT = ALL.filter(e => !ABSENT.has(e) && !DEVICE_PRESENT.has(e));

// ── Random check-in: 08:45–09:00 IST stored as UTC ───────────
function randomCheckIn() {
  // Minutes past 08:00: 45 to 60  (gives 08:45 to 09:00)
  const minPast8 = Math.floor(Math.random() * 16) + 45;
  const h   = 8 + Math.floor(minPast8 / 60);   // 8 or 9
  const min = minPast8 % 60;
  const sec = Math.floor(Math.random() * 60);
  // IST midnight of June 27 + offset → stored as UTC
  const istMidnight = new Date('2026-06-27T00:00:00+05:30').getTime();
  return new Date(istMidnight + h * 3600000 + min * 60000 + sec * 1000);
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  await connectMaster();
  const conn   = await getInstitutionConnection(INSTITUTION_ID);
  const models = createInstitutionModels(conn);
  const { User, Attendance } = models;

  // Today in UTC (covers full IST day of June 27)
  const dayStart = new Date('2026-06-26T18:30:00Z');
  const dayEnd   = new Date('2026-06-27T18:30:00Z');

  console.log(`\n📅 Date: ${DATE_STR} | ${INSTITUTION_ID}`);
  console.log(`📋 To insert:   ${TO_INSERT.length} (incl. ${[...OD].filter(e=>TO_INSERT.includes(e)).length} OD)`);
  console.log(`🔵 OD included: ${[...OD].join(', ')}`);
  console.log(`🔴 Absent skip: ${[...ABSENT].join(', ')}`);
  console.log(`✅ Device skip: ${[...DEVICE_PRESENT].join(', ')}\n`);

  let inserted = 0, skipped = 0, errors = 0;

  for (const empNo of TO_INSERT) {
    try {
      const user = await User.findOne({ employeeNo: empNo });
      if (!user) {
        console.warn(`⚠️  NOT FOUND: ${empNo}`);
        skipped++;
        continue;
      }

      // Skip if already has a manual entry today
      const dup = await Attendance.findOne({
        employeeNo: empNo,
        'raw.manualEntry': true,
        timestamp: { $gte: dayStart, $lt: dayEnd }
      });
      if (dup) {
        console.log(`⏭️  ${empNo} ${user.name} — manual entry exists, skipping`);
        skipped++;
        continue;
      }

      const checkIn = randomCheckIn();
      const isOD = OD.has(empNo);

      await Attendance.create({
        institutionId: INSTITUTION_ID,
        userId:        user._id,
        employeeNo:    user.employeeNo,
        eventType:     'manual-check-in',
        timestamp:     checkIn,
        raw: {
          name:          user.name,
          manualReason:  `Device not captured – manual entry 27-Jun-2026${isOD ? ' (On Duty)' : ''}`,
          manualEntry:   true,
          attendanceType:'FULL'
        }
      });

      // Display as IST
      const ist = new Date(checkIn.getTime() + 5.5 * 3600000);
      const timeStr = `${String(ist.getUTCHours()).padStart(2,'0')}:${String(ist.getUTCMinutes()).padStart(2,'0')}:${String(ist.getUTCSeconds()).padStart(2,'0')}`;
      console.log(`✅ ${empNo.padEnd(5)} | ${user.name.padEnd(33)} | ${timeStr} IST${isOD ? ' [OD]' : ''}`);
      inserted++;

    } catch (err) {
      console.error(`❌ ${empNo} — ${err.message}`);
      errors++;
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`✅ Inserted : ${inserted}`);
  console.log(`⏭️  Skipped  : ${skipped}`);
  console.log(`❌ Errors   : ${errors}`);
  console.log('══════════════════════════════════════════\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
