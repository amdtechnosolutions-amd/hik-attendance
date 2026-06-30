# On Duty Management - Postman Collection Documentation

This document provides instructions for using the Postman collection to test the On Duty functionality for faculty members in the attendance system.

## Setup Instructions

1. Import the collection:
   - Open Postman
   - Click "Import" button
   - Select the `OnDuty_Collection.json` file
   - Click "Import"

2. Import the environment:
   - Click "Import" button
   - Select the `OnDuty_Environment.json` file
   - Click "Import"

3. Configure the environment:
   - Click on the "Environments" tab
   - Select the "Faculty Attendance - On Duty" environment
   - Fill in the following variables:
     - `institution_id`: Your institution ID
     - `admin_email`: Admin email for login
     - `admin_password`: Admin password for login
   - Click "Save"

4. Select the environment:
   - In the top-right corner, select "Faculty Attendance - On Duty" from the environment dropdown

## Authentication

Before using the API endpoints, you need to authenticate:

1. Open the "Authentication" folder in the collection
2. Select the "Login" request
3. Click "Send"
4. The token will be automatically saved to the environment variables

## Testing On Duty Functionality

### Creating an On Duty Record

1. Open the "On Duty Management" folder
2. Select the "Create On Duty Record" request
3. Update the request body with appropriate values:
   ```json
   {
       "startDate": "2023-11-15T00:00:00.000Z",
       "endDate": "2023-11-17T23:59:59.999Z",
       "description": "Faculty attending conference at Delhi University"
   }
   ```
4. Update the `user_id` environment variable with the faculty member's ID
5. Click "Send"
6. Copy the `_id` from the response and set it as the `on_duty_id` environment variable

### Retrieving On Duty Records

#### For a Specific User:
1. Select the "Get User On Duty Records" request
2. Ensure the `user_id` environment variable is set
3. Click "Send"

#### For the Entire Institution:
1. Select the "Get Institution On Duty Records" request
2. Optionally update the query parameters for date filtering
3. Click "Send"

### Updating an On Duty Record

1. Select the "Update On Duty Record" request
2. Ensure the `on_duty_id` environment variable is set
3. Update the request body with the changes:
   ```json
   {
       "startDate": "2023-11-15T00:00:00.000Z",
       "endDate": "2023-11-18T23:59:59.999Z",
       "description": "Faculty attending conference and workshop at Delhi University"
   }
   ```
4. Click "Send"

### Deleting an On Duty Record

1. Select the "Delete On Duty Record" request
2. Ensure the `on_duty_id` environment variable is set
3. Click "Send"

## Generating Reports with On Duty Status

1. Open the "Reports" folder
2. Select the "Get Monthly Daily Status Report" request
3. Update the query parameters for month and year as needed
4. Click "Send"
5. The response will include links to download Excel and PDF reports that include On Duty status

## API Response Structure

### On Duty Record Object

```json
{
  "_id": "5f9d88b9e6b5c123456789ab",
  "institutionId": "5f9d88b9e6b5c123456789cd",
  "userId": "5f9d88b9e6b5c123456789ef",
  "employeeNo": "EMP001",
  "startDate": "2023-11-15T00:00:00.000Z",
  "endDate": "2023-11-17T23:59:59.999Z",
  "description": "Faculty attending conference at Delhi University",
  "createdAt": "2023-11-10T12:00:00.000Z",
  "updatedAt": "2023-11-10T12:00:00.000Z"
}
```

### Institution On Duty Records Response

```json
[
  {
    "_id": "5f9d88b9e6b5c123456789ab",
    "institutionId": "5f9d88b9e6b5c123456789cd",
    "userId": "5f9d88b9e6b5c123456789ef",
    "employeeNo": "EMP001",
    "startDate": "2023-11-15T00:00:00.000Z",
    "endDate": "2023-11-17T23:59:59.999Z",
    "description": "Faculty attending conference at Delhi University",
    "createdAt": "2023-11-10T12:00:00.000Z",
    "updatedAt": "2023-11-10T12:00:00.000Z",
    "userName": "John Doe",
    "employeeNo": "EMP001"
  }
]
```

## Troubleshooting

- **Authentication Issues**: If you receive 401 Unauthorized errors, try running the Login request again to get a fresh token.
- **Not Found Errors**: Ensure that the IDs in your environment variables are correct.
- **Validation Errors**: Check that all required fields are included in your request body.

## Notes

- The On Duty status will appear as "OD" in the daily status reports.
- On Duty days are counted as present for attendance calculations.
- The Excel report highlights On Duty days with a light green color.