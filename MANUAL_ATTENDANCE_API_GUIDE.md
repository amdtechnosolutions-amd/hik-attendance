# Manual Attendance API Guide

This guide explains how to use the Manual Attendance API to upload attendance records for users who were absent but should be marked as present.

## Overview

The Manual Attendance API allows administrators to:

1. Download a template Excel file for manual attendance records
2. Upload completed Excel files to mark absent users as present with specific check-in and check-out times
3. Provide reasons for manual attendance entries

## API Endpoints

### 1. Download Manual Attendance Template

**Endpoint:** `GET /api/institutions/:institutionId/manual-attendance-template`

**Description:** Downloads an Excel template file for manual attendance records.

**Response:** Excel file (.xlsx) with the following columns:
- EmployeeNo: Faculty/Employee ID
- Date: Date in YYYY-MM-DD format
- InTime: Check-in time in HH:MM:SS format
- OutTime: Check-out time in HH:MM:SS format
- Reason: Reason for manual attendance entry

### 2. Upload Manual Attendance Excel

**Endpoint:** `POST /api/institutions/:institutionId/upload-manual-attendance`

**Description:** Uploads a completed Excel file with manual attendance records.

**Authentication:** Required (Bearer token)

**Request:**
- Content-Type: multipart/form-data
- Body:
  - file: Excel file (.xlsx) with manual attendance records

**Response:**
```json
{
  "success": true,
  "message": "Upload completed. X attendance records created, Y failed",
  "summary": {
    "success": 5,
    "failed": 1,
    "errors": [
      "Row 3: User not found for EmployeeNo EMP999"
    ]
  }
}
```

## Excel File Format

The Excel file should follow this format:

| EmployeeNo | Date       | InTime   | OutTime  | Reason                |
|------------|------------|----------|----------|------------------------|
| EMP001     | 2025-01-15 | 09:00:00 | 17:00:00 | Biometric not working |
| EMP002     | 2025-01-15 | 09:30:00 | 17:30:00 | Forgot to punch       |
| EMP003     | 2025-01-15 | 08:45:00 | 16:45:00 | System error          |

## Validation Rules

The API performs the following validations:

1. All required columns must be present
2. EmployeeNo must exist in the system
3. Date must be in a valid format (YYYY-MM-DD)
4. InTime and OutTime must be in a valid format (HH:MM:SS or HH:MM)
5. InTime must be before OutTime
6. All required fields must be filled

## Error Handling

If there are errors in the Excel file, the API will:

1. Continue processing valid rows
2. Return a summary of successful and failed records
3. Provide detailed error messages for each failed row

## Demo Page

A demo page is available at `/manual_attendance_demo.html` to test the API functionality.

## Integration with Attendance Reports

Manual attendance records are integrated with regular attendance reports and will appear in:

1. Daily attendance reports
2. Monthly attendance summaries
3. Consolidated reports

Manual entries are marked with the reason provided during upload.