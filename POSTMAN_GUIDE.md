# Postman Collection Guide - Leave & Permission Management

## Import Collection

1. Open Postman
2. Click **Import** (top-left)
3. Select **Upload Files** and choose `postman-collection.json`
4. The collection will be imported with all endpoints organized by category

## Environment Variables Setup

Before making requests, configure these variables in Postman:

### 1. **baseUrl**
- **Value**: `http://localhost:3000/api` (or your server URL)
- **Example**: `https://yourdomain.com/api`

### 2. **token**
- **Value**: Your JWT authentication token
- **How to get**: 
  - Login via the auth/login endpoint
  - Copy the token from response
  - Paste into this variable

### 3. **institutionId**
- **Value**: The MongoDB ObjectId of your institution
- **Example**: `68e0e148f633a16a99a9df2e`

### 4. **userId**
- **Value**: The MongoDB ObjectId of a user
- **Used in**: Create leave/permission requests, get user-specific requests

### 5. **leaveId** / **permissionId**
- **Value**: The MongoDB ObjectId returned from create requests
- **Used in**: Approve/reject/delete operations

### 6. **leaveFile** / **permissionFile**
- **Value**: File path to Excel files (for bulk upload)
- **Example**: `/Users/yourname/Downloads/leaves.xlsx`

## API Endpoints Overview

### Leave Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/institutions/:institutionId/leaves` | Create leave request |
| **GET** | `/institutions/:institutionId/leaves` | Get all leaves (with filters) |
| **GET** | `/institutions/:institutionId/users/:userId/leaves` | Get user's leaves |
| **PUT** | `/institutions/:institutionId/leaves/:leaveId/approve` | Approve leave |
| **PUT** | `/institutions/:institutionId/leaves/:leaveId/reject` | Reject leave |
| **DELETE** | `/institutions/:institutionId/leaves/:leaveId` | Delete leave |
| **GET** | `/institutions/:institutionId/leave-template` | Download Excel template |
| **POST** | `/institutions/:institutionId/upload-leaves` | Bulk upload leaves |

### Permission Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/institutions/:institutionId/permissions` | Create permission request |
| **GET** | `/institutions/:institutionId/permissions` | Get all permissions (with filters) |
| **PUT** | `/institutions/:institutionId/permissions/:permissionId/approve` | Approve permission |
| **PUT** | `/institutions/:institutionId/permissions/:permissionId/reject` | Reject permission |
| **DELETE** | `/institutions/:institutionId/permissions/:permissionId` | Delete permission |
| **GET** | `/institutions/:institutionId/permission-template` | Download Excel template |
| **POST** | `/institutions/:institutionId/upload-permissions` | Bulk upload permissions |

## Request Examples

### 1. Create Leave Request

```json
{
  "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "leaveDate": "2025-12-15",
  "type": "half-day-morning",
  "reason": "Medical appointment"
}
```

**Type Options**:
- `half-day-morning` - Half day in morning
- `half-day-afternoon` - Half day in afternoon

---

### 2. Create Permission Request

```json
{
  "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
  "permissionDate": "2025-12-15",
  "type": "1-hour-morning",
  "reason": "Doctor appointment"
}
```

**Type Options**:
- `1-hour-morning` - 1 hour leave in morning
- `1-hour-afternoon` - 1 hour leave in afternoon

---

### 3. Approve Request

```json
{
  "comments": "Approved - valid reason"
}
```

---

### 4. Reject Request

```json
{
  "comments": "Not approved - insufficient notice period"
}
```

---

### 5. Get Leaves with Filters

**Query Parameters**:
- `status` - Filter by status: `pending`, `approved`, `rejected`
- `userId` - Filter by user
- `startDate` - Filter by date range start (YYYY-MM-DD)
- `endDate` - Filter by date range end (YYYY-MM-DD)

**Example URL**:
```
GET {{baseUrl}}/institutions/{{institutionId}}/leaves?status=pending&startDate=2025-12-01&endDate=2025-12-31
```

---

## Bulk Upload (Excel)

### Download Template
1. Select **Download Leave Template** or **Download Permission Template**
2. Send the request
3. File will be downloaded as `.xlsx`

### Upload Template Format

#### Leave Template (leave-template.xlsx)
| EmployeeNo | LeaveDate (YYYY-MM-DD) | Type | Reason |
|---|---|---|---|
| 007 | 2025-12-15 | half-day-morning | Medical appointment |
| 008 | 2025-12-16 | half-day-afternoon | Personal work |

#### Permission Template (permission-template.xlsx)
| EmployeeNo | PermissionDate (YYYY-MM-DD) | Type | Reason |
|---|---|---|---|
| 007 | 2025-12-15 | 1-hour-morning | Doctor appointment |
| 008 | 2025-12-16 | 1-hour-afternoon | Personal work |

### Upload Process
1. Download the template
2. Fill in your data (keep format consistent)
3. In Postman, select **Upload Leave Requests** or **Upload Permission Requests**
4. Attach the file in the Body → form-data section
5. Send the request

---

## Response Structure

### Create Leave/Permission Response
```json
{
  "success": true,
  "message": "Leave request created successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "institutionId": "68e0e148f633a16a99a9df2e",
    "userId": "64a1b2c3d4e5f6g7h8i9j0k1",
    "employeeNo": "007",
    "leaveDate": "2025-12-15T00:00:00.000Z",
    "type": "half-day-morning",
    "reason": "Medical appointment",
    "status": "pending",
    "createdAt": "2025-12-01T07:50:00.000Z",
    "updatedAt": "2025-12-01T07:50:00.000Z"
  }
}
```

### Get Leaves Response
```json
{
  "success": true,
  "data": [
    {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "employeeNo": "007",
      "leaveDate": "2025-12-15T00:00:00.000Z",
      "type": "half-day-morning",
      "reason": "Medical appointment",
      "status": "pending",
      "userId": {
        "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
        "name": "Smt. Annapoorneswari",
        "employeeNo": "007"
      },
      "approvedBy": null,
      "approvalDate": null,
      "comments": null
    }
  ]
}
```

### Approve/Reject Response
```json
{
  "success": true,
  "message": "Leave approved successfully",
  "data": {
    "_id": "64a1b2c3d4e5f6g7h8i9j0k1",
    "status": "approved",
    "approvedBy": {
      "_id": "64a1b2c3d4e5f6g7h8i9j0k2",
      "name": "Admin Name",
      "employeeNo": "001"
    },
    "approvalDate": "2025-12-01T08:00:00.000Z",
    "comments": "Approved - valid reason"
  }
}
```

### Upload Response
```json
{
  "success": true,
  "message": "Upload completed. 10 leaves created, 2 failed",
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

## Authentication

All endpoints (except template download) require:

**Header**: 
```
Authorization: Bearer <your_jwt_token>
```

### Get Token
1. Use the Login endpoint to get a token
2. Copy the token from response
3. Set it as the `token` variable in Postman environment

---

## Status Codes

| Code | Meaning |
|------|---------|
| **200** | Success - GET, PUT, DELETE operations |
| **201** | Created - POST operations successful |
| **400** | Bad Request - Missing or invalid fields |
| **404** | Not Found - Resource doesn't exist |
| **500** | Server Error - Database or server issue |

---

## Tips

1. **Test One Endpoint at a Time**: Start with simple GET requests before POST
2. **Check Environment Variables**: Ensure all variables are set correctly
3. **Use Pre-scripts for Tokens**: Add auto-token refresh in Postman
4. **Validate Dates**: Use `YYYY-MM-DD` format consistently
5. **Check Error Messages**: Error responses include details about what went wrong
6. **Bulk Upload Validation**: Download template to ensure correct format

---

## Troubleshooting

### "Authentication failed" error
- Check your JWT token is valid and not expired
- Re-login and update the token variable

### "User not found" in bulk upload
- Verify employee numbers in your Excel file match database
- Download checkUsers.js output to see correct employee numbers

### "Invalid date format" in bulk upload
- Ensure dates are in `YYYY-MM-DD` format
- Check for extra spaces or special characters

### CORS or network errors
- Verify baseUrl is correct
- Check if server is running
- Try from the same network/machine first
