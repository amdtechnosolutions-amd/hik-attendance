# CompOff Management - Postman Guide

## CompOff System Overview

The CompOff system allows tracking of compensatory off/leave earned when staff works on holidays:
- Staff work on holiday → Earn CompOff (Automatic or Manual)
- Staff uses CompOff on normal days → Marked as used
- CompOff balance tracked and displayed in attendance

---

## API Endpoints

### 1. Create CompOff (Manual Entry)
**POST** `/institutions/:institutionId/compoff/manual`

Staff worked on a holiday → Admin manually creates CompOff record

**Request Body:**
```json
{
  "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "holidayDate": "2025-12-25",
  "reason": "Worked on Christmas - Organized event"
}
```

**Response:**
```json
{
  "success": true,
  "message": "CompOff created successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "employeeNo": "007",
    "earnedDate": "2025-12-01T07:50:00.000Z",
    "holidayDate": "2025-12-25T00:00:00.000Z",
    "earningType": "manual",
    "status": "available",
    "reason": "Worked on Christmas - Organized event"
  }
}
```

---

### 2. Create CompOff (Automatic)
**POST** `/institutions/:institutionId/compoff/automatic`

System automatically creates CompOff when staff attends on holiday

**Request Body:**
```json
{
  "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "holidayDate": "2025-12-25"
}
```

---

### 3. Get All CompOff Records
**GET** `/institutions/:institutionId/compoff?status=available&startDate=2025-12-01&endDate=2025-12-31`

**Query Parameters:**
- `status` - Filter by: `available`, `used`, `cancelled`
- `userId` - Filter by specific user
- `startDate` - Filter by date range (YYYY-MM-DD)
- `endDate` - Filter by date range (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "employeeNo": "007",
      "earnedDate": "2025-12-01T07:50:00.000Z",
      "status": "available",
      "earningType": "manual",
      "userId": {
        "name": "Smt. Annapoorneswari",
        "employeeNo": "007"
      }
    }
  ]
}
```

---

### 4. Get CompOff Balance for User
**GET** `/institutions/:institutionId/users/:userId/compoff-balance`

Shows total available, used, and cancelled CompOff

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "earned": 5,
    "available": 3,
    "used": 2,
    "cancelled": 0,
    "balance": 3
  }
}
```

---

### 5. Mark CompOff as Used
**PUT** `/institutions/:institutionId/compoff/:compOffId/use`

Staff uses CompOff on a specific date (replaces absence)

**Request Body:**
```json
{
  "usedDate": "2025-12-10",
  "notes": "Used for personal appointment"
}
```

**Response:**
```json
{
  "success": true,
  "message": "CompOff marked as used and linked to attendance",
  "data": {
    "compOff": {
      "status": "used",
      "usedDate": "2025-12-10T00:00:00.000Z",
      "notes": "Used for personal appointment"
    },
    "attendanceRecord": {
      "date": "2025-12-10T00:00:00.000Z",
      "usedCompOff": true,
      "compOffNote": "Used for personal appointment"
    }
  }
}
```

**What Happens:**
- CompOff status changes from `available` → `used`
- Attendance record created/updated for that date
- `usedCompOff: true` marked in attendance
- Employee is not marked absent on that day

---

### 6. Cancel CompOff
**PUT** `/institutions/:institutionId/compoff/:compOffId/cancel`

Cancel a CompOff that's no longer needed

**Request Body:**
```json
{
  "reason": "Staff member resigned"
}
```

**Response:**
```json
{
  "success": true,
  "message": "CompOff cancelled successfully",
  "data": {
    "status": "cancelled",
    "notes": "Staff member resigned"
  }
}
```

**Note:** Cannot cancel CompOff already marked as used

---

### 7. Delete CompOff
**DELETE** `/institutions/:institutionId/compoff/:compOffId`

Permanently delete a CompOff record

**Response:**
```json
{
  "success": true,
  "message": "CompOff deleted successfully"
}
```

---

### 8. Download CompOff Template
**GET** `/institutions/:institutionId/compoff-template`

Download Excel template for bulk upload

**File Format:** `compoff-template.xlsx`

---

### 9. Bulk Upload CompOff Records
**POST** `/institutions/:institutionId/upload-compoff`

Upload multiple CompOff records from Excel file

**Excel Template Columns:**
| EmployeeNo | HolidayDate (YYYY-MM-DD) | Reason |
|---|---|---|
| 007 | 2025-12-25 | Worked on Christmas |
| 008 | 2025-01-26 | Worked on Republic Day |

**Response:**
```json
{
  "success": true,
  "message": "Upload completed. 10 CompOff created, 2 failed",
  "summary": {
    "success": 10,
    "failed": 2,
    "errors": [
      "Row 5: User not found for EmployeeNo 999",
      "Row 8: Invalid date format"
    ]
  }
}
```

---

## Reports

### 10. Monthly CompOff Report for User
**GET** `/institutions/:institutionId/users/:userId/compoff-report?month=12&year=2025`

Get detailed CompOff stats for a user in a specific month

**Query Parameters:**
- `month` - Month number (1-12)
- `year` - Year (YYYY)

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "employeeNo": "007",
      "name": "Smt. Annapoorneswari"
    },
    "stats": {
      "month": 12,
      "year": 2025,
      "earned": 2,
      "used": 1,
      "available": 1,
      "cancelled": 0,
      "balance": 1,
      "daysUsedCompOff": 1
    },
    "details": {
      "compOffEarned": [...],
      "compOffUsed": [...],
      "attendanceDaysWithCompOff": [...]
    }
  }
}
```

---

### 11. Institution-wide CompOff Summary
**GET** `/institutions/:institutionId/compoff-summary?month=12&year=2025`

Get summary of CompOff for all staff in a month

**Response:**
```json
{
  "success": true,
  "month": 12,
  "year": 2025,
  "totalUsers": 5,
  "data": [
    {
      "employeeNo": "007",
      "name": "Smt. Annapoorneswari",
      "earned": 2,
      "used": 1,
      "available": 1,
      "balance": 1
    },
    {
      "employeeNo": "008",
      "name": "Another Staff",
      "earned": 1,
      "used": 0,
      "available": 1,
      "balance": 1
    }
  ]
}
```

---

### 12. CompOff History for User
**GET** `/institutions/:institutionId/users/:userId/compoff-history?status=available`

Get all CompOff records for a user with optional status filter

**Query Parameters:**
- `status` - Filter by: `available`, `used`, `cancelled` (optional)

**Response:**
```json
{
  "success": true,
  "summary": {
    "total": 5,
    "available": 2,
    "used": 2,
    "cancelled": 1
  },
  "data": [
    {
      "earnedDate": "2025-12-25T00:00:00.000Z",
      "status": "available",
      "reason": "Worked on Christmas"
    }
  ]
}
```

---

## Integration with Attendance

### Daily Attendance Display
When viewing daily attendance for an employee:

```json
{
  "date": "2025-12-10",
  "employeeNo": "007",
  "usedCompOff": true,
  "compOffNote": "Used for personal appointment",
  "compOffId": "64a1b2c3d4e5f6g7h8i9j0k1"
}
```

**Indicates:** Staff used CompOff on this day (not absent)

---

### Monthly Attendance Summary
When viewing monthly attendance:

```json
{
  "month": 12,
  "year": 2025,
  "attendance": {
    "present": 18,
    "absent": 2,
    "leave": 3,
    "onDuty": 2,
    "compOffEarned": 2,
    "compOffUsed": 1,
    "compOffAvailable": 1
  }
}
```

---

## Use Cases

### Scenario 1: Holiday Work
**Holiday:** 25-Dec (Christmas)  
**Action:** Staff works on 25-Dec

**Process:**
1. CompOff is earned (automatic or manual)
2. Staff can use it on any normal working day
3. Example: Use on 10-Jan instead of taking leave

---

### Scenario 2: Monthly Report
**Need:** How many staff worked on holidays?

**Process:**
1. Call `GET /compoff-summary?month=12&year=2025`
2. See all staff with earned CompOff
3. Track who used it, who has balance

---

### Scenario 3: Staff Resignation
**Need:** Cancel unused CompOff when staff resigns

**Process:**
1. Find all available CompOff for that staff
2. Call `PUT /compoff/:id/cancel` for each
3. Record the reason: "Staff member resigned"

---

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "CompOff is already used" | Trying to use already used CompOff | Check status first |
| "Cannot cancel CompOff that has been used" | Trying to cancel used CompOff | Only cancel available ones |
| "User not found" (bulk upload) | Employee number doesn't exist | Verify employee numbers in Excel |
| "Invalid date format" (bulk upload) | Date not in YYYY-MM-DD format | Use correct date format |

---

## Notes

- **No expiry:** CompOff never expires (can be used anytime)
- **Auto-approved:** All CompOff are auto-approved on creation
- **Linked to Attendance:** When used, automatically updates attendance record
- **Balance Tracking:** Total balance shown = available + (never expires)
- **Reports:** All reports automatically calculate from CompOff and Attendance data
