# MNCVV Manual Attendance Documentation

This guide explains the process for performing manual attendance entries for institution **MNCVV**, specifically focusing on employees **001** and **002**.

## Overview

Manual attendance is used to mark employees as present when they have missed their biometric punch but were physically present. The system allows bulk uploading these records via an Excel file.

## 1. Prepare the Excel File

The Excel file must contain the following columns exactly as named:

| EmployeeNo | Date       | InTime   | OutTime  | Reason                | AttendanceType |
|------------|------------|----------|----------|-----------------------|----------------|
| 001        | 2026-04-25 | 09:00:00 | 17:00:00 | Biometric not working | FULL           |
| 002        | 2026-04-25 | 09:00:00 | 17:00:00 | Forgot to punch       | FULL           |

### Field Descriptions:
- **EmployeeNo**: The unique ID of the employee (e.g., `001`, `002`).
- **Date**: The date of attendance in `YYYY-MM-DD` format.
- **InTime**: The check-in time in `HH:MM:SS` format.
- **OutTime**: The check-out time in `HH:MM:SS` format.
- **Reason**: A brief explanation for the manual entry.
- **AttendanceType**: (Optional) Use `FULL` for full day or `ML/P` for Morning Leave/Afternoon Present. Defaults to `FULL`.

> [!IMPORTANT]
> **Automatic Time Correction:**
> To ensure attendance records appear "natural" and meet institutional requirements, the system automatically adjusts times:
> - If **InTime** is 09:00:00 or later, it is randomized to a time between **08:30 AM and 08:50 AM**.
> - If **OutTime** is before 04:30 PM, it is randomized to a time between **04:31 PM and 04:59 PM**.

## 2. Download the Excel Template

Before uploading, you can download a pre-formatted Excel template.

### API Endpoint (GET Method)
**Endpoint:** `GET /api/institutions/:institutionId/manual-attendance-template`

**How to use:**
- Replace `:institutionId` with the MNCVV institution ID.
- Open this URL in your browser or make a `GET` request.
- The server will respond with an `.xlsx` file containing the correct headers and sample data.

---

## 3. Uploading the Records

There are two primary ways to upload manual attendance:

### A. Using the Web Interface (Demo Page)
1. Navigate to: `http://<server-url>/manual_attendance_demo.html`
2. Select the institution **MNCVV** (or provide its ID).
3. Upload the prepared Excel file.
4. Review the results summary.

### B. Using the Single Manual Entry API (New)
**Endpoint:** `POST /api/attendance/manual-entry`

This endpoint allows you to log a single attendance record without an Excel file.

**Request Body (JSON):**
```json
{
  "institutionId": "YOUR_INSTITUTION_ID",
  "employeeNo": "001",
  "date": "2026-04-25",
  "inTime": "09:00:00",
  "outTime": "17:00:00",
  "reason": "Biometric failure",
  "attendanceType": "FULL"
}
```

**Headers:**
- `Content-Type`: application/json
- `Authorization`: Bearer <Your_Token>

### C. Using the Bulk Upload API
**Endpoint:** `POST /api/institutions/:institutionId/upload-manual-attendance`

**Parameters:**
- `institutionId`: The unique ID for MNCVV.
- `file`: The Excel file (multipart/form-data).

**Headers:**
- `Authorization`: Bearer <Your_Token>

### D. List Manual Attendance Records (New)
**Endpoint:** `GET /api/institutions/:institutionId/manual-attendance`

This endpoint allows you to retrieve a list of all manual attendance entries for an institution.

**Query Parameters (Optional):**
- `employeeNo`: Filter by a specific employee ID.
- `date`: Filter by a specific date (`YYYY-MM-DD`).
- `from`: Start date for a range (`YYYY-MM-DD`).
- `to`: End date for a range (`YYYY-MM-DD`).

**Headers:**
- `Authorization`: Bearer <Your_Token>

**Example Response:**
```json
{
  "success": true,
  "count": 2,
  "records": [
    {
      "employeeNo": "001",
      "eventType": "manual-check-in",
      "timestamp": "2026-04-25T08:45:00.000Z",
      "raw": {
        "manualReason": "Face Not reading",
        "manualEntry": true
      }
    }
  ]
}
```

### E. Delete a Manual Attendance Record (New)
**Endpoint:** `DELETE /api/institutions/:institutionId/manual-attendance/:id`

This endpoint allows you to delete a specific manual attendance record using its unique `_id`.

**Parameters:**
- `:institutionId`: The unique ID for MNCVV.
- `:id`: The unique `_id` of the record (obtained from the List API).

**Headers:**
- `Authorization`: Bearer <Your_Token>

**Example Response:**
```json
{
  "success": true,
  "message": "Manual attendance record deleted successfully"
}
```

---

## 4. Verification

Once uploaded, the records will:
1. Appear in the **Daily Attendance Report**.
2. Be included in the **Consolidated Monthly Report**.
3. Be marked as `manual-check-in` and `manual-check-out` in the database.

## Troubleshooting

- **User Not Found**: Ensure the `EmployeeNo` (e.g., `001`) matches exactly what is stored in the `users` collection for MNCVV.
- **Invalid Date/Time**: Ensure the Excel cells are formatted correctly as Text or Date/Time.
- **Missing Columns**: Do not rename or remove any of the required headers in the Excel file.

---
*Created on: 2026-04-25*
