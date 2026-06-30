# Guide: Replacing On Duty Records with Manual Attendance

This guide explains how to replace existing On Duty (OD) records with manual attendance records for specific dates.

## Overview

Sometimes, you may need to replace On Duty records with manual attendance records for specific dates. This could be because:

1. The wrong type of record was created initially
2. You need to update the attendance type for reporting purposes
3. You need to correct attendance records for specific employees

The process involves two main steps:
1. Delete existing On Duty records for the specified date range
2. Upload manual attendance records for those dates

## Using the Web Interface

We've created a dedicated web interface to simplify this process. Access it at:

```
http://localhost:4000/replace_od_with_manual_attendance.html
```

### Step 1: Authentication

1. Enter your email, password, and institution ID
2. Click "Login" to authenticate

### Step 2: Delete On Duty Records

1. Enter the start and end dates for the records you want to replace
2. Optionally, enter specific employee numbers (comma-separated) to limit the deletion to those employees
3. Click "Delete On Duty Records"
4. Verify the deletion was successful

### Step 3: Upload Manual Attendance

1. Click "Download Template" to get the Excel template
2. Fill in the template with the attendance data:
   - EmployeeNo: Faculty/Employee ID (e.g., EMP001)
   - Date: Date in YYYY-MM-DD format (e.g., 2025-01-15)
   - InTime: Check-in time in HH:MM:SS format (e.g., 09:00:00)
   - OutTime: Check-out time in HH:MM:SS format (e.g., 17:00:00)
   - Reason: Reason for manual attendance entry
3. Click "Choose Excel File" to select your completed template
4. Click "Upload Attendance Data"
5. Verify the upload was successful

## Using the API Directly

If you prefer to use the API directly, here are the endpoints:

### 1. Delete On Duty Records

**Endpoint:** `POST /api/institutions/:institutionId/delete-on-duty-by-dates`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "startDate": "2023-05-01",
  "endDate": "2023-05-31",
  "employeeNos": ["EMP001", "EMP002"]  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully deleted 5 On Duty records",
  "deletedCount": 5
}
```

### 2. Upload Manual Attendance

**Endpoint:** `POST /api/institutions/:institutionId/upload-manual-attendance`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Request Body:**
Form data with a file field named 'file' containing the Excel spreadsheet.

**Response:**
```json
{
  "success": true,
  "message": "Upload completed. 10 attendance records created, 0 failed",
  "summary": {
    "success": 10,
    "failed": 0,
    "errors": []
  }
}
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure you're using the correct email and password
   - Check that your token hasn't expired

2. **No Records Deleted**
   - Verify the date range is correct
   - Check if there are any On Duty records in that date range
   - Ensure the employee numbers are correct if you're filtering by employee

3. **Upload Failures**
   - Check the Excel format matches the template
   - Ensure all required fields are filled
   - Verify the employee numbers exist in the system
   - Check that the date and time formats are correct

### Verifying the Changes

To verify that the On Duty records have been replaced with manual attendance records:

1. Check the attendance reports for the affected dates
2. The manual attendance records should appear with "manual-check-in" and "manual-check-out" event types
3. The On Duty records should no longer appear for those dates

## Support

If you encounter any issues or need assistance, please contact the system administrator.