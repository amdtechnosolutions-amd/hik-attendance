# On Duty (OD) File Upload Guide

## Overview
This feature allows you to bulk upload On Duty records for faculty members using an Excel file. This is much faster than creating individual OD records one by one.

## Quick Start

### Step 1: Download the Template
Use this API endpoint to download the OD upload template:

```
GET /api/institutions/{institutionId}/on-duty-template
```

**Example:**
```
http://localhost:4000/api/institutions/630e1234567890123456abcd/on-duty-template
```

The template will be downloaded as `OD_Upload_Template.xlsx`

### Step 2: Fill in the Template

The Excel file has 4 required columns:

| Column | Format | Example | Notes |
|--------|--------|---------|-------|
| **EmployeeNo** | Text | EMP001 | Must match existing employee number in system |
| **StartDate** | YYYY-MM-DD | 2025-01-15 | Date format: Year-Month-Day |
| **EndDate** | YYYY-MM-DD | 2025-01-17 | Must be >= StartDate |
| **Description** | Text | Conference in Delhi | Reason for On Duty |

**Example:**
```
EmployeeNo    StartDate     EndDate       Description
EMP001        2025-01-15    2025-01-17    Conference in Delhi
EMP002        2025-01-20    2025-01-22    Workshop Training
EMP003        2025-02-01    2025-02-05    Official Leave
```

### Step 3: Upload the File

Use this API endpoint to upload the filled Excel file:

```
POST /api/institutions/{institutionId}/upload-on-duty
Content-Type: multipart/form-data

File: [select your Excel file]
```

**Headers Required:**
- `Authorization: Bearer {your-auth-token}`

**Example using cURL:**
```bash
curl -X POST \
  http://localhost:4000/api/institutions/630e1234567890123456abcd/upload-on-duty \
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \
  -F 'file=@OD_Upload_Template.xlsx'
```

**Example using JavaScript/Fetch:**
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch(
  '/api/institutions/630e1234567890123456abcd/upload-on-duty',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: formData
  }
);

const result = await response.json();
console.log(result);
```

### Step 4: Check Results

The API will return a response like:

```json
{
  "success": true,
  "message": "Upload completed. 3 records created, 0 failed",
  "summary": {
    "success": 3,
    "failed": 0,
    "errors": []
  }
}
```

If there are errors, they'll be listed in the errors array:

```json
{
  "success": true,
  "message": "Upload completed. 2 records created, 1 failed",
  "summary": {
    "success": 2,
    "failed": 1,
    "errors": [
      "Row 3: User not found for Employee No: EMP999"
    ]
  }
}
```

---

## Date Format Options

The system supports multiple date formats:
- `YYYY-MM-DD` (recommended) - 2025-01-15
- `DD-MM-YYYY` - 15-01-2025
- `MM/DD/YYYY` - 01/15/2025

---

## Validation Rules

✅ **Valid:**
- Employee number must exist in the system
- Start date must be before or equal to end date
- All required columns must be filled
- Description is non-empty

❌ **Invalid:**
- Missing Employee No
- Employee not found in system
- Start date > End date
- Invalid date format
- Empty Description field

---

## Common Errors & Solutions

### Error: "Missing required columns"
**Solution:** Ensure your Excel file has exactly these headers:
- EmployeeNo
- StartDate
- EndDate
- Description

### Error: "User not found for Employee No: EMP001"
**Solution:** Check that the employee number exists in the system. Use the correct employee ID.

### Error: "Invalid date format"
**Solution:** Use one of these formats:
- YYYY-MM-DD (e.g., 2025-01-15)
- DD-MM-YYYY (e.g., 15-01-2025)
- MM/DD/YYYY (e.g., 01/15/2025)

### Error: "Start date must be before end date"
**Solution:** Ensure StartDate <= EndDate

---

## Best Practices

1. **Always download the template first** - This ensures you have the correct column headers
2. **Use YYYY-MM-DD format** - While other formats work, this is the most reliable
3. **Verify employee numbers** - Check employee IDs before uploading
4. **Review small batches first** - Test with 3-5 records before uploading large datasets
5. **Keep descriptions concise** - Use clear, brief reasons for OD
6. **One employee per row** - Don't merge cells or use complex formatting

---

## Bulk Upload Example

**Scenario:** Upload OD for a 3-day conference

```
EmployeeNo    StartDate     EndDate       Description
EMP001        2025-02-10    2025-02-12    National Conference 2025
EMP002        2025-02-10    2025-02-12    National Conference 2025
EMP003        2025-02-10    2025-02-12    National Conference 2025
EMP004        2025-02-10    2025-02-12    National Conference 2025
```

Upload this file, and all 4 faculty members will be marked as On Duty for those dates.

---

## How On Duty Affects Reports

- OD records **exclude** the day from working day columns in reports
- OD records are listed in the "Weekend/Holiday Dates" section
- OD is counted as **Present** in attendance statistics
- OD description appears in export files for reference

---

## API Response Details

### Success Response (200 OK):
```json
{
  "success": true,
  "message": "Upload completed. 5 records created, 0 failed",
  "summary": {
    "success": 5,
    "failed": 0,
    "errors": []
  }
}
```

### Error Response (400/500):
```json
{
  "success": false,
  "message": "Missing required columns: Description",
  "error": "..."
}
```

---

## Related APIs

- **Create Single OD:** `POST /api/institutions/{institutionId}/users/{userId}/on-duty`
- **Get OD Records:** `GET /api/institutions/{institutionId}/on-duty`
- **Update OD:** `PUT /api/institutions/{institutionId}/on-duty/{onDutyId}`
- **Delete OD:** `DELETE /api/institutions/{institutionId}/on-duty/{onDutyId}`

---

## Support

For issues or questions, check the error messages in the upload response. Each error includes:
- Row number where the error occurred
- Employee number (if identified)
- Specific reason for the failure