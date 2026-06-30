# Sync Attendance — How It Works & Troubleshooting

## Overview

The **Sync Attendance** button on the admin dashboard pulls attendance event logs directly from the connected Hikvision device (via its ISAPI HTTP interface) and saves them into the institution's MongoDB database.

This is a **background job** — so when you press the button, the system immediately returns a "queued" response and processes the sync in the background so the UI doesn't freeze.

---

## How the Sync Flow Works

```
Frontend                  Backend API               Hikvision Device
   │                          │                           │
   │  POST /sync-device        │                           │
   │ ─────────────────────────►│                           │
   │                          │ 1. Create SyncJob         │
   │                          │    status: "pending"      │
   │◄─────────────────────────│                           │
   │  { jobId, status:"queued"}│                           │
   │                          │ 2. setImmediate() ──────► │
   │                          │    processSyncJob()       │
   │  GET /sync-job-status    │    status: "processing"   │
   │  ?jobId=...              │                           │
   │ ─────────────────────────►│ 3. Fetch AcsEvents       │
   │◄─────────────────────────│◄──────────────────────────│
   │  { status, records, msg } │ 4. Save to Attendance DB  │
   │                          │    status: "completed"    │
```

### Steps:
1. **POST** to `/api/institutions/:institutionId/attendance/sync-device` with `deviceId`, `startTime`, `endTime`
2. A `SyncJob` document is created in MongoDB with `status: "pending"`
3. `setImmediate()` kicks off the background job (non-blocking)
4. The API immediately returns `{ status: "queued", jobId }`
5. The background job connects to the Hikvision device, fetches events, and saves them
6. Poll `GET /sync-job-status?jobId=...` to track progress

---

## Why "Sync in Queue" Appears (Nothing Happening)

The message **"Sync in Queue"** is the initial API response. It is **always shown first** regardless of whether the sync succeeds or fails. This is by design — the actual sync happens in the background after the response is sent.

### ✅ This is NORMAL behavior if:
- The device is online and reachable
- The job completes within seconds
- Polling `/sync-job-status` shows `"completed"` with a record count

### ❌ This is a PROBLEM when:
The sync stays "pending" or the frontend never shows completion. This usually means the background job silently failed.

---

## Common Failure Reasons & How to Fix

### 1. 🔌 Device Unreachable — ECONNREFUSED
**Error saved:** `Device unreachable at 124.123.64.64:33001 — connection refused`

**Cause:** The server cannot connect to the Hikvision device's IP/port.

**Fix:**
- Verify the device is **powered on**
- Check that the **IP address and port** in the device settings are correct
- Ensure there is no **firewall** blocking port `33001` between the server and the device
- Test from the server: `curl http://124.123.64.64:33001/` — should NOT say "Connection refused"

---

### 2. ⏱️ Connection Timeout — ConnectTimeout
**Error saved:** `Connection to device 124.123.64.64:33001 timed out`

**Cause:** The server can reach the network but the device doesn't respond in time.

**Fix:**
- The device may be **busy** — try again after 1–2 minutes
- Check the device's **network cable** or WiFi signal
- The device might be **rebooting** — wait 2–3 minutes and try again

---

### 3. 🔐 Authentication Failed — 401 Unauthorized
**Error saved:** `Authentication failed for device 124.123.64.64:33001. Check the device username/password`

**Cause:** Wrong username/password stored for the device.

**Fix:**
- Go to **Device Settings** in the admin panel
- Update the **username** and **password** to match the device's actual credentials
- Default Hikvision credentials are often `admin` / `Hikvision@123` or a custom set password

---

### 4. 🔄 Connection Reset — ECONNRESET / "other side closed"
**Error saved:** `Device closed the connection unexpectedly`

**Cause:** The device reset the TCP connection mid-sync. This is **recoverable** — the system retries up to 3 times automatically.

**Fix:** Usually resolves automatically. If it persists:
- The device may be **overloaded** — reduce sync frequency
- Try syncing a **smaller time window** (e.g., last 2 hours instead of full day)

---

### 5. ✅ Already Up to Date (0 records, status: completed)
**This is normal.** If the last sync already fetched the latest events, the next sync returns `recordedCount: 0`. This means all attendance is already saved.

---

## How to Check Sync Job Status

After pressing Sync, the response includes a `jobId`. Use it to check the status:

```
GET /api/institutions/{institutionId}/attendance/sync-job-status?jobId={jobId}
```

### Response Fields:
| Field | Description |
|---|---|
| `status` | `pending` / `processing` / `completed` / `failed` |
| `statusMessage` | Human-readable description of what happened |
| `recordedCount` | Number of attendance records saved |
| `error` | Error message if sync failed (device unreachable etc.) |
| `progress.totalEvents` | Events fetched so far (during processing) |
| `startedAt` | When the sync job started |
| `completedAt` | When the sync job finished |

### Example: Successful Sync
```json
{
  "success": true,
  "status": "completed",
  "statusMessage": "Sync completed successfully. 47 attendance record(s) saved.",
  "recordedCount": 47,
  "error": null
}
```

### Example: Failed Sync (Device Offline)
```json
{
  "success": true,
  "status": "failed",
  "statusMessage": "Device unreachable at 124.123.64.64:33001 — connection refused. Check if the device is powered on and reachable from the server.",
  "recordedCount": 0,
  "error": "Device unreachable at 124.123.64.64:33001 — connection refused."
}
```

---

## Request Body for Sync

```json
POST /api/institutions/{institutionId}/attendance/sync-device
Authorization: Bearer {token}

{
  "deviceId": "68e0e1d6f633a16a99a9df3b",
  "startTime": "2026-06-05T00:00:00",
  "endTime": "2026-06-05T23:59:59",
  "fullSync": false
}
```

| Field | Description |
|---|---|
| `deviceId` | MongoDB ObjectId of the device to sync from |
| `startTime` | Start of the time window (ISO 8601 format) |
| `endTime` | End of the time window (ISO 8601 format) |
| `fullSync` | If `true`, ignores the last synced timestamp and fetches everything. If `false` (default), only fetches events after the last synced record |

---

## Notes for Frontend Developers

> **Important:** The frontend must **poll** `/sync-job-status?jobId=...` after the initial sync trigger to show the real outcome. The initial `"queued"` response does NOT mean the sync succeeded.

### Recommended Polling Pattern:
1. Call `POST /sync-device` → get `jobId`
2. Show "Syncing..." spinner
3. Poll `GET /sync-job-status?jobId=...` every **2 seconds**
4. When `status === "completed"` or `"failed"`:
   - Show `statusMessage` to the user
   - Stop polling

---

## Real-time Event Push (HTTP Listening / Alarm Host)

Instead of manually syncing, the Hikvision device can be configured to push attendance logs to the backend in real-time as users tap their cards/faces.

### ⚙️ Correct Hikvision HTTP Listening Settings:

On the Hikvision device configuration page under **Network** -> **Advanced Settings** -> **HTTP Listening** (or Alarm Host):

1. **Event Alarm IP/Domain Name:** `hikapi.amdtechno.in`
2. **URL:** `/api/institutions/68e0e148f633a16a99a9df2e/hikvision/listen`
   > [!IMPORTANT]
   > The URL field must be a **relative path starting with `/`**. Do **NOT** put `www.hikapi.amdtechno.in/...` or `https://...` in this field.
3. **Port:** `443`
   > [!IMPORTANT]
   > You must use the standard HTTPS port **`443`** (not `9001`). The public domain `hikapi.amdtechno.in` is served over secure SSL on port `443` via Nginx, which then forwards the request internally to port `9001`. Port `9001` is not publicly open for HTTPS connections.
4. **Protocol:** `HTTPS`

### Troubleshooting Real-Time Push:

If the data is not pushing:
1. Ensure the backend endpoint in `src/routes.js` is set to `router.post()` (as Hikvision pushes events using HTTP `POST` requests).
2. Verify that the server's Nginx is listening on port `443` and has a valid SSL certificate.
3. Check the PM2 log output for incoming push requests:
   ```bash
   pm2 logs hik-attendance --lines 100 | grep "Hikvision Listener"
   ```

---

## Checking Logs (Server Admin)

```bash
# View last 100 lines of sync logs
pm2 logs hik-attendance --lines 100 --nostream | grep -i "sync\|SyncJob\|Listener"

# View only error logs
pm2 logs hik-attendance --err --lines 50 --nostream
```

---

*Last updated: June 5, 2026*
