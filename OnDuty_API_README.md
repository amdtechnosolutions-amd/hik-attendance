# OnDuty API - Postman Collection Guide

## Overview
This Postman collection provides complete API testing coverage for the OnDuty management system, including CRUD operations, Excel import/export, and bulk operations.

## Collection File
- **File**: `OnDuty_API.postman_collection.json`
- **Base URL**: `http://localhost:9001` (configurable via collection variables)

## Importing the Collection

1. Open Postman
2. Click **Import** button
3. Select the `OnDuty_API.postman_collection.json` file
4. Click **Import**

## Collection Variables

Before using the collection, update these variables in **Collection > Variables**:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `baseUrl` | API base URL | `http://localhost:9001` |
| `institutionId` | Your institution ID | `507f1f77bcf86cd799439011` |
| `userId` | User ID for testing | `507f191e810c19729de860ea` |
| `onDutyId` | OnDuty record ID | `507f191e810c19729de860eb` |
| `authToken` | JWT token (auto-set after login) | Auto-populated |

## API Endpoints

### 1. Authentication

#### Login
- **Method**: POST
- **Endpoint**: `/auth/login`
- **Auth**: None required
- **Body**:
```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```
- **Note**: The auth token is automatically saved to collection variables after successful login

---

### 2. CRUD Operations

#### Create OnDuty Record
- **Method**: POST
- **Endpoint**: `/institutions/:institutionId/users/:userId/on-duty`
- **Auth**: Bearer Token (required)
- **Body**:
```json
{
  "userId": "507f191e810c19729de860ea",
  "employeeNo": "EMP001",
  "startDate": "2024-01-15",
  "endDate": "2024-01-15",
  "description": "Official meeting at district office"
}
```

#### Get User OnDuty Records
- **Method**: GET
- **Endpoint**: `/institutions/:institutionId/users/:userId/on-duty`
- **Auth**: Bearer Token (required)
- **Returns**: Array of OnDuty records for the specified user

#### Get Institution OnDuty Records
- **Method**: GET
- **Endpoint**: `/institutions/:institutionId/on-duty`
- **Auth**: Bearer Token (required)
- **Query Parameters** (optional):
  - `startDate`: Filter from this date (YYYY-MM-DD)
  - `endDate`: Filter to this date (YYYY-MM-DD)
- **Returns**: Array of all OnDuty records with populated user details

#### Update OnDuty Record
- **Method**: PUT
- **Endpoint**: `/institutions/:institutionId/on-duty/:onDutyId`
- **Auth**: Bearer Token (required)
- **Body** (all fields optional):
```json
{
  "startDate": "2024-01-16",
  "endDate": "2024-01-17",
  "description": "Updated: Extended meeting"
}
```

#### Delete OnDuty Record
- **Method**: DELETE
- **Endpoint**: `/institutions/:institutionId/on-duty/:onDutyId`
- **Auth**: Bearer Token (required)

---

### 3. Excel Operations

#### Download OnDuty Template
- **Method**: GET
- **Endpoint**: `/institutions/:institutionId/on-duty-template`
- **Auth**: None required
- **Returns**: Excel file with template and sample data
- **Template Columns**:
  - EmployeeNo
  - StartDate (YYYY-MM-DD)
  - EndDate (YYYY-MM-DD)
  - Description

#### Upload OnDuty Excel
- **Method**: POST
- **Endpoint**: `/institutions/:institutionId/upload-on-duty`
- **Auth**: Bearer Token (required)
- **Body**: Form-data
  - `file`: Excel file (.xlsx)
- **Returns**:
```json
{
  "success": true,
  "message": "Upload completed. 10 records created, 2 failed",
  "summary": {
    "success": 10,
    "failed": 2,
    "errors": [
      "Row 5: User not found for EmployeeNo EMP999"
    ]
  }
}
```

---

### 4. Bulk Operations

#### Delete OnDuty by Date Range
- **Method**: POST
- **Endpoint**: `/institutions/:institutionId/delete-on-duty-by-dates`
- **Auth**: Bearer Token (required)
- **Body**:
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```
- **Note**: Deletes all records that start, end, or span the date range

#### Delete OnDuty by Date Range and Employees
- **Method**: POST
- **Endpoint**: `/institutions/:institutionId/delete-on-duty-by-dates`
- **Auth**: Bearer Token (required)
- **Body**:
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "employeeNos": ["EMP001", "EMP002", "EMP003"]
}
```
- **Note**: `employeeNos` is optional. If provided, only deletes records for specified employees.

---

## Quick Start Guide

1. **Import the collection** into Postman
2. **Set collection variables**:
   - Update `baseUrl`, `institutionId`, `userId`
3. **Login**:
   - Run the "Login" request
   - Token will be auto-saved
4. **Test CRUD operations**:
   - Create a new OnDuty record
   - Get the record (note the `_id` returned)
   - Update the `onDutyId` variable with the returned ID
   - Update or delete the record
5. **Test Excel operations**:
   - Download the template
   - Fill in the template with test data
   - Upload the Excel file

## Date Format
All dates must be in **YYYY-MM-DD** format (e.g., `2024-01-15`)

## Error Responses

Common error responses:

### 400 Bad Request
```json
{
  "message": "Invalid date format"
}
```

### 404 Not Found
```json
{
  "message": "On Duty record not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to create On Duty record",
  "error": "Detailed error message"
}
```

## Testing Workflow Example

### Scenario: Bulk Upload OnDuty Records

1. **Download Template**
   - Run "Download OnDuty Template"
   - Save the Excel file

2. **Prepare Data**
   - Open the downloaded template
   - Add multiple rows with employee data:
     ```
     EmployeeNo | StartDate  | EndDate    | Description
     EMP001     | 2024-01-15 | 2024-01-15 | Training session
     EMP002     | 2024-01-16 | 2024-01-17 | Conference
     EMP003     | 2024-01-20 | 2024-01-20 | Official meeting
     ```

3. **Upload Excel**
   - Run "Upload OnDuty Excel"
   - Attach the filled Excel file
   - Review the response for success/failure summary

4. **Verify Upload**
   - Run "Get Institution OnDuty Records"
   - Verify all records were created

5. **Cleanup (Optional)**
   - Run "Delete OnDuty by Date Range"
   - Specify the date range to remove test data

## Tips

- **Authentication**: The collection uses Bearer Token authentication. Make sure to login first.
- **Auto-save Token**: The login request automatically saves the token to collection variables.
- **Variables**: Use collection variables for IDs to avoid hardcoding values.
- **Date Filtering**: Use query parameters on the "Get Institution OnDuty Records" endpoint to filter by date range.
- **Bulk Delete**: Be careful with bulk delete operations - they cannot be undone!

## Support

For issues or questions:
- Check the API response error messages
- Verify collection variables are set correctly
- Ensure the server is running on the correct port (default: 9001)
- Check authentication token is valid and not expired
