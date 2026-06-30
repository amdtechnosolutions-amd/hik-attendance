# On Duty Management for Faculty Attendance System

## Overview

The On Duty (OD) functionality allows administrators to mark faculty members as "On Duty" when they are away from the institution for official purposes. This ensures that faculty members are not marked as absent when they are performing official duties outside the institution.

## Features

- Create, view, update, and delete On Duty records
- Filter On Duty records by date range
- View On Duty records for specific users or the entire institution
- Integration with attendance reports (Excel and PDF)
- Visual highlighting of On Duty days in reports
- On Duty days are counted as present for attendance calculations

## Implementation Details

### Database Model

The On Duty functionality is implemented using a MongoDB model with the following schema:

```javascript
const OnDutySchema = new Schema({
  institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  employeeNo: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### API Endpoints

The following API endpoints are available for managing On Duty records:

1. **Create On Duty Record**
   - `POST /institutions/:institutionId/users/:userId/on-duty`
   - Creates a new On Duty record for a faculty member

2. **Get User On Duty Records**
   - `GET /institutions/:institutionId/users/:userId/on-duty`
   - Retrieves all On Duty records for a specific user

3. **Get Institution On Duty Records**
   - `GET /institutions/:institutionId/on-duty`
   - Retrieves all On Duty records for an institution with optional date filtering

4. **Update On Duty Record**
   - `PUT /institutions/:institutionId/on-duty/:onDutyId`
   - Updates an existing On Duty record

5. **Delete On Duty Record**
   - `DELETE /institutions/:institutionId/on-duty/:onDutyId`
   - Deletes an On Duty record

### Report Integration

The On Duty status is integrated into the following reports:

1. **Monthly Daily Status Report**
   - Excel format: On Duty days are highlighted in light green and marked as "OD"
   - PDF format: On Duty days are highlighted in light green and marked as "OD"
   - A legend is included at the bottom of both reports explaining the "OD" status

## Usage

### Creating an On Duty Record

To create an On Duty record, you need to provide:
- User ID (faculty member)
- Start date
- End date
- Description (reason for On Duty)

Example request:

```json
POST /institutions/123/users/456/on-duty
{
  "startDate": "2023-11-15T00:00:00.000Z",
  "endDate": "2023-11-17T23:59:59.999Z",
  "description": "Faculty attending conference at Delhi University"
}
```

### Viewing On Duty Records

To view On Duty records for a specific user:

```
GET /institutions/123/users/456/on-duty
```

To view On Duty records for an entire institution with date filtering:

```
GET /institutions/123/on-duty?startDate=2023-11-01&endDate=2023-11-30
```

### Updating an On Duty Record

To update an existing On Duty record:

```json
PUT /institutions/123/on-duty/789
{
  "description": "Updated description"
}
```

### Deleting an On Duty Record

To delete an On Duty record:

```
DELETE /institutions/123/on-duty/789
```

## Testing

### Postman Collections

Two Postman collections are provided for testing the On Duty functionality:

1. **OnDuty_Collection.json** - Basic collection for testing the API endpoints
2. **OnDuty_Collection_Extended.json** - Extended collection with additional test cases

### Test Script

A Node.js test script is provided in `scripts/test_on_duty.js` for programmatically testing the On Duty functionality.

### Demo Page

A demo HTML page is available at `public/on_duty_demo.html` for testing the On Duty functionality through a web interface.

## Files

- **src/models/OnDuty.js** - Database model for On Duty records
- **src/controllers/userController.js** - Controller functions for On Duty management
- **src/routes.js** - API routes for On Duty endpoints
- **postman/** - Postman collections and documentation
- **scripts/test_on_duty.js** - Test script for On Duty functionality
- **public/on_duty_demo.html** - Demo page for On Duty management

## Best Practices

1. **Date Handling**
   - Always use ISO format for dates in API requests
   - Store dates in UTC format in the database
   - Display dates in the local timezone in the UI

2. **Validation**
   - Validate that start date is before end date
   - Ensure all required fields are provided
   - Check for overlapping On Duty periods for the same user

3. **Security**
   - Only authenticated users can access On Duty endpoints
   - Only administrators can create, update, or delete On Duty records
   - Validate that the user belongs to the specified institution

## Future Enhancements

1. **Approval Workflow**
   - Add a status field to track approval status (pending, approved, rejected)
   - Implement an approval workflow for On Duty requests
   - Send notifications for approval status changes

2. **Document Attachments**
   - Allow attaching supporting documents to On Duty records
   - Implement document storage and retrieval

3. **Reporting Enhancements**
   - Add dedicated reports for On Duty statistics
   - Implement filters for On Duty types
   - Add visualization of On Duty patterns

4. **UI Integration**
   - Develop a user interface for managing On Duty records
   - Implement a calendar view for On Duty periods
   - Add drag-and-drop functionality for date selection