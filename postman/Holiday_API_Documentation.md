# Holiday API Documentation

This document provides detailed information about using the Holiday API for managing institution holidays and emergency holidays in the Hikvision Attendance system.

## Prerequisites

- Postman installed on your computer
- Access to the Hikvision Attendance API server
- Valid user credentials with appropriate permissions (Institution Admin or Master Admin)

## Importing the Collection

1. Open Postman
2. Click on "Import" in the top left corner
3. Select the `Holiday_API_Collection.json` file
4. Click "Import"

## Setting Up Environment Variables

Before using the collection, create a new environment in Postman with the following variables:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `baseUrl` | Base URL of the API | `http://localhost:4000` |
| `token` | JWT token from login | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `institutionId` | ID of the institution | `68c160eae77b04e4b08ad66c` |
| `holidayId` | ID of a holiday record | `60f1a1b2c3d4e5f6a7b8c9d0` |
| `startDate` | Start date for filtering | `2025-12-01` |
| `endDate` | End date for filtering | `2025-12-22` |

## Authentication

1. Use the "Login" request to obtain a token
2. Enter valid credentials in the request body:
   ```json
   {
     "username": "admin",
     "password": "your_password"
   }
   ```
3. Copy the token from the response and set it as the `token` environment variable

## API Endpoints

### 1. Create Holiday (Emergency Holiday or Institution Holiday)

Creates a new holiday record for an institution.

- **Method**: POST
- **URL**: `{{baseUrl}}/api/institutions/{{institutionId}}/holidays`
- **Headers**:
  - Content-Type: application/json
  - Authorization: Bearer {{token}}
- **Body**:
  ```json
  {
    "name": "Year-End Holiday",
    "startDate": "2025-12-20T00:00:00.000Z",
    "endDate": "2025-12-22T23:59:59.999Z",
    "type": "emergency-holiday",
    "description": "Emergency closure due to maintenance",
    "showInAttendance": false
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "success": true,
    "holiday": {
      "_id": "60f1a1b2c3d4e5f6a7b8c9d0",
      "institutionId": "68c160eae77b04e4b08ad66c",
      "name": "Year-End Holiday",
      "startDate": "2025-12-20T00:00:00.000Z",
      "endDate": "2025-12-22T23:59:59.999Z",
      "type": "emergency-holiday",
      "description": "Emergency closure due to maintenance",
      "isActive": true,
      "showInAttendance": false,
      "createdBy": "60d1a2b3c4d5e6f7a8b9c0d2",
      "createdAt": "2025-12-18T10:30:00.000Z",
      "updatedAt": "2025-12-18T10:30:00.000Z"
    }
  }
  ```

### 2. Get All Holidays

Retrieves all holidays for an institution with optional filtering.

- **Method**: GET
- **URL**: `{{baseUrl}}/api/institutions/{{institutionId}}/holidays`
- **Query Parameters**:
  - `startDate` (optional): Filter holidays from this date (YYYY-MM-DD)
  - `endDate` (optional): Filter holidays until this date (YYYY-MM-DD)
  - `type` (optional): Filter by type (`institution-holiday`, `emergency-holiday`, `special-day`)
  - `showOnly` (optional): Show only holidays with `showInAttendance=true` (true/false)

**Example with Filters**:
```
{{baseUrl}}/api/institutions/{{institutionId}}/holidays?startDate=2025-12-01&endDate=2025-12-31&type=emergency-holiday
```

- **Headers**:
  - Authorization: Bearer {{token}}
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "holidays": [
      {
        "_id": "60f1a1b2c3d4e5f6a7b8c9d0",
        "institutionId": "68c160eae77b04e4b08ad66c",
        "name": "Year-End Holiday",
        "startDate": "2025-12-20T00:00:00.000Z",
        "endDate": "2025-12-22T23:59:59.999Z",
        "type": "emergency-holiday",
        "description": "Emergency closure due to maintenance",
        "isActive": true,
        "showInAttendance": false,
        "createdBy": "60d1a2b3c4d5e6f7a8b9c0d2",
        "createdAt": "2025-12-18T10:30:00.000Z",
        "updatedAt": "2025-12-18T10:30:00.000Z"
      },
      {
        "_id": "60f1a1b2c3d4e5f6a7b8c9d1",
        "institutionId": "68c160eae77b04e4b08ad66c",
        "name": "Institution Holiday",
        "startDate": "2025-12-01T00:00:00.000Z",
        "endDate": "2025-12-02T23:59:59.999Z",
        "type": "institution-holiday",
        "description": "Annual holiday",
        "isActive": true,
        "showInAttendance": true,
        "createdBy": "60d1a2b3c4d5e6f7a8b9c0d2",
        "createdAt": "2025-11-20T10:30:00.000Z",
        "updatedAt": "2025-11-20T10:30:00.000Z"
      }
    ]
  }
  ```

### 3. Get Holiday by ID

Retrieves a specific holiday record.

- **Method**: GET
- **URL**: `{{baseUrl}}/api/institutions/{{institutionId}}/holidays/{{holidayId}}`
- **Headers**:
  - Authorization: Bearer {{token}}
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "holiday": {
      "_id": "60f1a1b2c3d4e5f6a7b8c9d0",
      "institutionId": "68c160eae77b04e4b08ad66c",
      "name": "Year-End Holiday",
      "startDate": "2025-12-20T00:00:00.000Z",
      "endDate": "2025-12-22T23:59:59.999Z",
      "type": "emergency-holiday",
      "description": "Emergency closure due to maintenance",
      "isActive": true,
      "showInAttendance": false,
      "createdBy": "60d1a2b3c4d5e6f7a8b9c0d2",
      "createdAt": "2025-12-18T10:30:00.000Z",
      "updatedAt": "2025-12-18T10:30:00.000Z"
    }
  }
  ```

### 4. Update Holiday

Updates an existing holiday record.

- **Method**: PUT
- **URL**: `{{baseUrl}}/api/institutions/{{institutionId}}/holidays/{{holidayId}}`
- **Headers**:
  - Content-Type: application/json
  - Authorization: Bearer {{token}}
- **Body** (all fields optional):
  ```json
  {
    "name": "Extended Year-End Holiday",
    "startDate": "2025-12-20T00:00:00.000Z",
    "endDate": "2025-12-25T23:59:59.999Z",
    "description": "Extended closure",
    "showInAttendance": true
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "holiday": {
      "_id": "60f1a1b2c3d4e5f6a7b8c9d0",
      "institutionId": "68c160eae77b04e4b08ad66c",
      "name": "Extended Year-End Holiday",
      "startDate": "2025-12-20T00:00:00.000Z",
      "endDate": "2025-12-25T23:59:59.999Z",
      "type": "emergency-holiday",
      "description": "Extended closure",
      "isActive": true,
      "showInAttendance": true,
      "createdBy": "60d1a2b3c4d5e6f7a8b9c0d2",
      "createdAt": "2025-12-18T10:30:00.000Z",
      "updatedAt": "2025-12-18T14:45:00.000Z"
    }
  }
  ```

### 5. Delete Holiday (Soft Delete)

Soft deletes a holiday (marks as inactive).

- **Method**: DELETE
- **URL**: `{{baseUrl}}/api/institutions/{{institutionId}}/holidays/{{holidayId}}`
- **Headers**:
  - Authorization: Bearer {{token}}
- **Response** (200 OK):
  ```json
  {
    "success": true,
    "message": "Holiday deleted"
  }
  ```

## Holiday Types

| Type | Description |
|------|-------------|
| `institution-holiday` | Regular institution holidays (fixed or recurring) |
| `emergency-holiday` | Emergency closures or special closures |
| `special-day` | Special observance days that may not affect attendance |

## showInAttendance Field

- **true**: Holiday will be displayed in attendance reports and excluded from working day calculations
- **false**: Holiday exists in system but won't affect attendance calculations

## Data Models

### Holiday Object

```json
{
  "_id": "60f1a1b2c3d4e5f6a7b8c9d0",
  "institutionId": "68c160eae77b04e4b08ad66c",
  "name": "Year-End Holiday",
  "startDate": "2025-12-20T00:00:00.000Z",
  "endDate": "2025-12-22T23:59:59.999Z",
  "type": "emergency-holiday",
  "description": "Emergency closure due to maintenance",
  "isActive": true,
  "showInAttendance": false,
  "createdBy": "60d1a2b3c4d5e6f7a8b9c0d2",
  "createdAt": "2025-12-18T10:30:00.000Z",
  "updatedAt": "2025-12-18T10:30:00.000Z"
}
```

## Error Responses

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Holiday not found
- `500 Internal Server Error`: Server-side error

Error response example:
```json
{
  "success": false,
  "message": "Start date must be before end date"
}
```

## Common Use Cases

### 1. Add December 2025 Holidays

```bash
# Holiday 1: Dec 1-2
POST /api/institutions/{{institutionId}}/holidays
{
  "name": "Institution Holiday",
  "startDate": "2025-12-01T00:00:00.000Z",
  "endDate": "2025-12-02T23:59:59.999Z",
  "type": "institution-holiday",
  "showInAttendance": true
}

# Holiday 2: Dec 20-22
POST /api/institutions/{{institutionId}}/holidays
{
  "name": "Year-End Holiday",
  "startDate": "2025-12-20T00:00:00.000Z",
  "endDate": "2025-12-22T23:59:59.999Z",
  "type": "institution-holiday",
  "showInAttendance": true
}
```

### 2. Get All December 2025 Holidays

```
GET /api/institutions/{{institutionId}}/holidays?startDate=2025-12-01&endDate=2025-12-31
```

### 3. Emergency Holiday (Unplanned Closure)

```bash
POST /api/institutions/{{institutionId}}/holidays
{
  "name": "Emergency Closure",
  "startDate": "2025-12-25T00:00:00.000Z",
  "endDate": "2025-12-25T23:59:59.999Z",
  "type": "emergency-holiday",
  "description": "Unexpected closure",
  "showInAttendance": false
}
```

### 4. Remove/Delete a Holiday

```
DELETE /api/institutions/{{institutionId}}/holidays/{{holidayId}}
```

## Testing Workflow

1. **Authenticate**: Login to get a valid token
2. **Create**: Create one or more holiday records
3. **List**: Retrieve all holidays to verify creation
4. **Update**: Modify a holiday (e.g., extend dates)
5. **Verify Update**: Fetch the holiday again
6. **Delete**: Remove the holiday
7. **Verify Deletion**: Confirm it's no longer active

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Verify the token is valid and not expired
   - Check that token is set in environment variables
   - Ensure user has institution admin permissions

2. **404 Not Found**:
   - Confirm the holiday ID exists
   - Verify the institution ID is correct

3. **400 Bad Request**:
   - Use ISO 8601 date format: `2025-12-20T00:00:00.000Z`
   - Ensure `startDate` ≤ `endDate`
   - Verify all required fields are provided

4. **Validation Errors**:
   - Confirm type is one of: `institution-holiday`, `emergency-holiday`, `special-day`
   - Check that dates are in valid format

## Notes

- Holidays use ISO 8601 date format with timezone (UTC)
- Soft delete is used (holidays marked inactive, not permanently removed)
- Multiple holidays can overlap
- Holidays affect attendance reports and working day calculations when `showInAttendance=true`
