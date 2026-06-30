# On Duty Management for Faculty Attendance System

This directory contains Postman collections and documentation for testing the On Duty (OD) functionality in the Faculty Attendance System.

## Overview

The On Duty functionality allows administrators to mark faculty members as "On Duty" when they are away from the institution for official purposes such as:
- Attending conferences
- Participating in workshops
- Conducting field research
- Representing the institution at external events
- Other official duties

When a faculty member is marked as "On Duty", they are considered present for attendance purposes, and their status is displayed as "OD" in reports.

## Files in this Directory

1. **OnDuty_Collection.json** - Basic Postman collection for testing On Duty functionality
2. **OnDuty_Collection_Extended.json** - Extended collection with additional test cases and validation tests
3. **OnDuty_API_Collection.json** - Updated Postman collection with the latest API endpoints
4. **OnDuty_Environment.json** - Environment variables for the Postman collections
5. **OnDuty_API_Environment.json** - Updated environment variables for the API collection
6. **OnDuty_Documentation.md** - Detailed documentation on using the Postman collection
7. **OnDuty_API_Documentation.md** - Documentation for the updated API collection
8. **README.md** - This file

## API Endpoints

The On Duty functionality is implemented through the following API endpoints:

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

## Report Integration

The On Duty status is integrated into the following reports:

1. **Monthly Daily Status Report**
   - Excel format: On Duty days are highlighted in light green and marked as "OD"
   - PDF format: On Duty days are highlighted in light green and marked as "OD"
   - A legend is included at the bottom of both reports explaining the "OD" status

## Getting Started

1. Import the Postman collection and environment files into Postman
2. Configure the environment variables with your specific values
3. Follow the instructions in `OnDuty_Documentation.md` for detailed usage

## Choosing a Collection

- **OnDuty_Collection.json**: Use this for basic testing of the On Duty functionality
- **OnDuty_Collection_Extended.json**: Use this for comprehensive testing including edge cases and validation
- **OnDuty_API_Collection.json**: Use this for the most up-to-date API endpoints with proper authentication and environment variables

## Additional Notes

- On Duty records require a start date, end date, and description
- On Duty status is calculated for each day between the start and end dates (inclusive)
- On Duty days are counted as present for attendance calculations
- The system prevents overlapping On Duty records for the same faculty member