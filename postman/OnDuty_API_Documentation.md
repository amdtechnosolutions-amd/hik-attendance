# On Duty API Documentation

This document provides detailed information about using the `OnDuty_API_Collection.json` Postman collection for testing the On Duty functionality in the Hikvision Attendance system.

## Prerequisites

- Postman installed on your computer
- Access to the Hikvision Attendance API server
- Valid user credentials with appropriate permissions

## Importing the Collection

1. Open Postman
2. Click on "Import" in the top left corner
3. Select the `OnDuty_API_Collection.json` file
4. Click "Import"

## Setting Up Environment Variables

Before using the collection, create a new environment in Postman with the following variables:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `baseUrl` | Base URL of the API | `http://localhost:4000` |
| `token` | JWT token from login | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `institutionId` | ID of the institution | `60e1a2b3c4d5e6f7a8b9c0d1` |
| `userId` | ID of the user | `60d1a2b3c4d5e6f7a8b9c0d2` |
| `onDutyId` | ID of an On Duty record | `60f1a1b2c3d4e5f6a7b8c9d0` |
| `startDate` | Start date for filtering | `2025-10-01` |
| `endDate` | End date for filtering | `2025-10-31` |

## Authentication

1. Use the "Login" request in the Authentication folder
2. Enter valid credentials in the request body:
   ```json
   {
     "username": "admin",
     "password": "password"
   }
   ```
3. Send the request
4. From the response, copy the token value and set it as the `token` environment variable

## API Endpoints

### 1. Create On Duty Record

Creates a new On Duty record for a specific user.

- **Method**: POST
- **URL**: `{{baseUrl}}/api/institutions/{{institutionId}}/users/{{userId}}/on-duty`
- **Headers**:
  - Content-Type: application/json
  - Authorization: Bearer {{token}}
- **Body**:
  ```json
  {
    "startDate": "2025-10-15T00:00:00.000Z",
    "endDate": "2025-10-16T23:59:59.999Z",
    "description": "Conference attendance"
  }
  ```
- **Response**: The created On Duty record object

### 2. Get User On Duty Records

Retrieves all On Duty records for a specific user.

- **Method**: GET
- **URL**: `{{baseUrl}}/api/institutions/{{institutionId}}/users/{{userId}}/on-duty`
- **Headers**:
  - Authorization: Bearer {{token}}
- **Response**: Array of On Duty record objects for the user

### 3. Get Institution On Duty Records

Retrieves all On Duty records for an institution with optional date filtering.

- **Method**: GET
- **URL**: `{{baseUrl}}/api/institutions/{{institutionId}}/on-duty?startDate={{startDate}}&endDate={{endDate}}`
- **Headers**:
  - Authorization: Bearer {{token}}
- **Query Parameters**:
  - `startDate`: Optional filter for start date (YYYY-MM-DD)
  - `endDate`: Optional filter for end date (YYYY-MM-DD)
- **Response**: Array of On Duty record objects for the institution

### 4. Update On Duty Record

Updates an existing On Duty record.

- **Method**: PUT
- **URL**: `{{baseUrl}}/api/institutions/{{institutionId}}/on-duty/{{onDutyId}}`
- **Headers**:
  - Content-Type: application/json
  - Authorization: Bearer {{token}}
- **Body**:
  ```json
  {
    "startDate": "2025-10-15T00:00:00.000Z",
    "endDate": "2025-10-17T23:59:59.999Z",
    "description": "Extended conference attendance"
  }
  ```
- **Response**: The updated On Duty record object

### 5. Delete On Duty Record

Deletes an On Duty record.

- **Method**: DELETE
- **URL**: `{{baseUrl}}/api/institutions/{{institutionId}}/on-duty/{{onDutyId}}`
- **Headers**:
  - Authorization: Bearer {{token}}
- **Response**: Success message

## Data Models

### On Duty Record Object

```json
{
  "_id": "60f1a1b2c3d4e5f6a7b8c9d0",
  "institutionId": "60e1a2b3c4d5e6f7a8b9c0d1",
  "userId": "60d1a2b3c4d5e6f7a8b9c0d2",
  "employeeNo": "001",
  "startDate": "2025-10-15T00:00:00.000Z",
  "endDate": "2025-10-16T23:59:59.999Z",
  "description": "Conference attendance",
  "createdAt": "2025-10-10T12:34:56.789Z",
  "updatedAt": "2025-10-10T12:34:56.789Z"
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

Error responses include a message field with details about the error:

```json
{
  "message": "Start date must be before or equal to end date"
}
```

## Testing Workflow

1. **Authentication**: Use the Login endpoint to get a valid token
2. **Create**: Create a new On Duty record for a user
3. **Read**: Verify the record was created by fetching user's On Duty records
4. **Update**: Modify the record (e.g., extend the end date)
5. **Verify**: Fetch the record again to confirm the update
6. **Delete**: Remove the record when no longer needed
7. **Verify Deletion**: Confirm the record was deleted

## Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Ensure you're using a valid token
   - Check that the token is correctly set in the environment variable
   - Verify the token hasn't expired

2. **404 Not Found Errors**:
   - Confirm the institution ID and user ID are correct
   - Verify the On Duty ID exists when updating or deleting

3. **400 Bad Request Errors**:
   - Check the date formats (ISO 8601 format is required)
   - Ensure start date is before or equal to end date
   - Verify all required fields are provided

4. **500 Server Errors**:
   - Check the server logs for more details
   - Verify the database connection is working
   - Ensure the server is running properly

## Additional Notes

- On Duty records require a start date, end date, and description
- On Duty status is calculated for each day between the start and end dates (inclusive)
- On Duty days are counted as present for attendance calculations
- The system prevents overlapping On Duty records for the same faculty member