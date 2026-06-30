/**
 * hikvisionController.js
 *
 * Ported from KSA project (/home/amdtechno/projects/ksa/controllers/hikvisionController.js)
 * Adapted for the multi-institution hik-attendance architecture.
 *
 * Key features ported from KSA:
 *  - XML → JSON parsing via xml2js
 *  - Heartbeat filtering (no DB writes, clean single-line log)
 *  - 24-hour stale data filter
 *  - serialNo deduplication via AccessLog model
 *  - Event type classification: FACE | CARD | PIN_SUCCESS | PIN_FAIL | UNKNOWN
 *  - File logging to hikvision_events.log
 *  - Richer console output with emojis
 */

import fs from 'fs';
import multer from 'multer';
import { parseStringPromise } from 'xml2js';
import Attendance from '../models/Attendance.js';
import AccessLog from '../models/AccessLog.js';
import User from '../models/User.js';

// ── multer: parse multipart/form-data fields + in-memory file buffers ─────────
export const uploadHikvision = multer();

// ── Timestamp helper ──────────────────────────────────────────────────────────
const ts = () => new Date().toISOString();

// ── Classify event type (mirrors KSA logic exactly) ──────────────────────────
function classifyEvent(major, minor, verifyMode = '') {
    major = Number(major || 0);
    minor = Number(minor || 0);

    if (major === 5 && minor === 75 && verifyMode.includes('face')) return 'FACE';
    if (major === 5 && minor === 104)  return 'FACE';
    if (major === 0 && minor === 1)    return 'FACE';
    if (major === 0 && minor === 2)    return 'CARD';
    if (major === 5 && minor === 75)   return 'PIN_SUCCESS';
    if (major === 5 && minor === 86)   return 'PIN_FAIL';
    return 'UNKNOWN';
}

// ── Normalise employeeNo casing (e.g. ksacri010 → Ksacri010, ported from KSA) ─
function normaliseEmpNo(empNo) {
    if (!empNo) return null;
    const match = String(empNo).match(/^([a-zA-Z]+)(\d+)$/);
    if (match) {
        const prefix = match[1];
        const rest   = match[2];
        return prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase() + rest;
    }
    return empNo;
}

// ── Log to file (same as KSA) ─────────────────────────────────────────────────
function appendToLogFile(body) {
    try {
        const logEntry = `[${ts()}] ${JSON.stringify(body, null, 2)}\n-----------------------------------\n`;
        fs.appendFileSync('hikvision_events.log', logEntry);
    } catch (e) {
        console.warn('[HIK] Could not write to hikvision_events.log:', e.message);
    }
}

// ── Main Listener ─────────────────────────────────────────────────────────────
export const listenToEvent = async (req, res) => {
    const { institutionId } = req.params;

    console.log(`\n🔔 [HIK] ${ts()} | ${req.method} | Institution: ${institutionId} | IP: ${req.ip}`);
    console.log(`[HIK] Content-Type: ${req.headers['content-type'] || 'none'}`);

    // ── RAW DUMP (full visibility of everything the device sends) ────────────
    console.log('[HIK] ═══════════════ RAW DUMP START ═══════════════');

    // All request headers
    console.log('[HIK] HEADERS:', JSON.stringify(req.headers, null, 2));

    // Raw req.body (before any custom parsing)
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        console.log('[HIK] BODY (parsed object):', JSON.stringify(req.body, null, 2));
    } else if (typeof req.body === 'string' && req.body.length > 0) {
        console.log('[HIK] BODY (raw string):\n' + req.body);
    } else {
        console.log('[HIK] BODY: (empty)');
    }

    // rawBody set by app.js middleware (catches non-JSON/non-XML content types)
    if (req.rawBody) {
        console.log('[HIK] RAW_BODY:\n' + req.rawBody);
    }

    // Multipart files
    if (req.files && req.files.length > 0) {
        console.log(`[HIK] FILES COUNT: ${req.files.length}`);
        req.files.forEach((f, i) => {
            console.log(`[HIK] FILE[${i}] fieldname="${f.fieldname}" | mime="${f.mimetype}" | size=${f.size}B`);
            if (f.buffer && f.size > 0) {
                const text = f.buffer.toString('utf8');
                // Check if it's printable text (>90% printable chars)
                const printableCount = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').length;
                if (printableCount / Math.max(text.length, 1) > 0.9) {
                    console.log(`[HIK] FILE[${i}] CONTENT (text):\n${text}`);
                } else {
                    const hexDump = f.buffer.slice(0, 512).toString('hex').match(/.{1,32}/g).join('\n');
                    console.log(`[HIK] FILE[${i}] CONTENT (hex, first 512B):\n${hexDump}`);
                }
            }
        });
    } else {
        console.log('[HIK] FILES: (none)');
    }

    // Multipart text fields (req.body fields from multer)
    if (req.body && typeof req.body === 'object') {
        const fields = Object.entries(req.body);
        if (fields.length > 0) {
            console.log('[HIK] MULTIPART FIELDS:');
            fields.forEach(([k, v]) => console.log(`  ${k} = ${v}`));
        }
    }

    console.log('[HIK] ═══════════════ RAW DUMP END ═════════════════');

    // ── Respond immediately (Hikvision manual p.50: must respond quickly) ────
    res.status(200).end();

    try {
        // ── Step 1: Resolve body (JSON / XML / multipart text field) ──────────
        let body = req.body;

        // KSA pattern: if body is XML string, parse it
        if (typeof body === 'string' && body.trim().startsWith('<')) {
            body = await parseStringPromise(body, { explicitArray: false });
        }

        // KSA: also check rawBody set by app.js middleware
        if ((!body || Object.keys(body).length === 0) && req.rawBody) {
            const raw = req.rawBody.trim();
            if (raw.startsWith('<')) {
                body = await parseStringPromise(raw, { explicitArray: false });
            } else {
                try { body = JSON.parse(raw); } catch { /* ignore */ }
            }
        }

        // ── Step 2: Print files (if any) ──────────────────────────────────────
        if (req.files && req.files.length > 0) {
            console.log(`[HIK] ══ FILES: ${req.files.length} ══`);
            req.files.forEach((f, i) => {
                console.log(`  [${i + 1}] fieldname=${f.fieldname} | mime=${f.mimetype} | size=${f.size}B`);
                if (f.buffer) {
                    const isText = f.mimetype?.includes('text') || f.mimetype?.includes('xml') || f.mimetype?.includes('json') || f.size < 4096;
                    if (isText) {
                        const text = f.buffer.toString('utf8');
                        const printable = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').length;
                        if (printable / text.length > 0.9) {
                            console.log(`  ── RAW CONTENT (text) ──\n${text}`);
                        } else {
                            console.log(`  ── RAW CONTENT (hex) ──\n${f.buffer.slice(0, 512).toString('hex').match(/.{1,32}/g).join('\n')}`);
                        }
                    } else {
                        console.log(`  ── RAW CONTENT (hex preview) ──\n${f.buffer.slice(0, 256).toString('hex').match(/.{1,32}/g).join('\n')}\n  ... (${f.size - 256} more bytes)`);
                    }
                }
            });
        }

        // ── Step 3: Unpack AccessControllerEvent (KSA pattern) ───────────────
        let targetObj = body?.AccessControllerEvent || body?.EventNotificationAlert?.AccessControllerEvent;

        if (typeof targetObj === 'string') {
            try { targetObj = JSON.parse(targetObj); body = { ...body, ...targetObj }; } catch { /* ignore */ }
        } else if (typeof targetObj === 'object' && targetObj !== null) {
            body = { ...body, ...targetObj };
        }

        const event =
            targetObj?.AccessControllerEvent ||
            targetObj ||
            body?.EventNotificationAlert ||
            body?.AcsEvent ||
            body;

        // ── Step 4: Heartbeat filter (KSA: quiet single-line log, no DB) ─────
        const isHeartbeat =
            event?.eventType === 'heartBeat' ||
            event?.eventDescription === 'heartBeat' ||
            body?.EventNotificationAlert?.eventType === 'heartBeat';

        if (isHeartbeat) {
            console.log(`❤️ [HIK] HEARTBEAT | ${ts()} | from ${body?.ipAddress || req.ip}`);
            return;
        }

        // ── Step 5: Full log + file write (non-heartbeat only, KSA pattern) ──
        console.log('📥 [HIK] Incoming event:', JSON.stringify(event, null, 2));
        appendToLogFile(body);

        // ── Step 6: Extract key fields ────────────────────────────────────────
        const eventTimeStr =
            event?.time || event?.dateTime ||
            body?.EventNotificationAlert?.dateTime ||
            body?.dateTime || ts();

        const eventTime = new Date(eventTimeStr);
        const driftMs   = Math.abs(Date.now() - eventTime.getTime());

        let employeeNo = normaliseEmpNo(
            event?.employeeNoString || event?.employeeNo ||
            body?.employeeNoString  || null
        );

        const serialNo     = event?.serialNo ? Number(event.serialNo) : null;
        const employeeName = event?.name || event?.employeeName || 'Unknown';
        const major        = event?.majorEventType ?? event?.majorEvent ?? 0;
        const minor        = event?.minorEventType ?? event?.subEventType ?? event?.minorEvent ?? 0;
        const verifyMode   = event?.currentVerifyMode || '';
        const ipAddress    = body?.ipAddress || req.ip;
        const eventType    = classifyEvent(major, minor, verifyMode);

        console.log(`[HIK] 👤 empNo: ${employeeNo || '(none)'} | 🏷️ type: ${eventType} | ⏱️ time: ${eventTimeStr} | serial: ${serialNo}`);

        // ── Step 7: 24-hour stale filter (KSA: discard old buffered data) ────
        if (driftMs > 1000 * 60 * 60 * 24) {
            console.log(`🗑️ [HIK] IGNORED OLD DATA: ${eventTime.toISOString()} (drift ${(driftMs/3600000).toFixed(1)}h) for ${employeeNo || 'N/A'}`);
            return;
        }

        if (driftMs > 1000 * 60 * 5) {
            console.log(`📜 [HIK] BUFFER_SYNC: Historical event ${eventTime.toISOString()} for ${employeeNo}`);
        }

        // ── Get institution-scoped models ─────────────────────────────────────
        const { models } = req.institutionDb || {};
        const AttendanceModel = models?.Attendance ?? Attendance;
        const UserModel       = models?.User       ?? User;
        const AccessLogModel  = models?.AccessLog  ?? AccessLog;

        if (!models) {
            console.warn('[HIK] ⚠️  institutionDb not attached – using default models.');
        }

        // ── Step 8: serialNo deduplication (KSA pattern) ──────────────────────
        if (serialNo) {
            const exists = await AccessLogModel.findOne({ serialNo, institutionId });
            if (exists) {
                console.log(`🔁 [HIK] Skipping duplicate event (serialNo: ${serialNo})`);
                return;
            }
        }

        // ── Step 9: Skip system events with no employeeNo ─────────────────────
        if (!employeeNo) {
            console.log(`ℹ️ [HIK] No employeeNo – system event. Skipping attendance.`);
            // Still store an AccessLog entry for traceability
            await AccessLogModel.create({ institutionId, employeeNo: null, type: eventType, eventTime, serialNo, ipAddress, details: event }).catch(() => {});
            return;
        }

        // ── Step 10: Store AccessLog ───────────────────────────────────────────
        await AccessLogModel.create({
            institutionId,
            employeeNo,
            type:      eventType,
            eventTime,
            serialNo,
            ipAddress,
            details:   event,
        });

        // ── Step 11: User lookup ───────────────────────────────────────────────
        const user = await UserModel.findOne({ employeeNo });
        if (!user) {
            console.warn(`❌ [HIK] No user found for employeeNo: ${employeeNo}`);
            return;
        }
        console.log(`✅ [HIK] Event Processed → Name: ${user.name} | ID: ${employeeNo} | Time: ${eventTimeStr} | Type: ${eventType}`);

        // ── Step 12: Attendance – only for valid auth events ───────────────────
        const isAuth = ['FACE', 'CARD', 'PIN_SUCCESS'].includes(eventType);
        if (!isAuth) {
            console.log(`[HIK] ℹ️  Event type ${eventType} not an auth event – skipping attendance.`);
            return;
        }

        // 5-second window duplicate check (belt + braces with serialNo above)
        const dup = await AttendanceModel.findOne({
            institutionId,
            employeeNo,
            timestamp: {
                $gte: new Date(eventTime.getTime() - 5000),
                $lte: new Date(eventTime.getTime() + 5000),
            },
        });

        if (dup) {
            console.log(`⏭️ [HIK] Duplicate attendance punch for ${employeeNo} – skipped.`);
            return;
        }

        await AttendanceModel.create({
            institutionId,
            userId:    user._id,
            employeeNo,
            deviceId:  null,
            eventType: `${major}-${minor}`,
            timestamp: eventTime,
            raw:       event,
        });

        console.log(`📘 [HIK] Attendance recorded for ${employeeNo} (${user.name}) at ${eventTime.toISOString()}`);

    } catch (err) {
        console.error(`❌ [HIK] Fatal error for institution ${institutionId}:`, err);
    }
};
