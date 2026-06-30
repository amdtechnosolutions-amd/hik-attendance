# On Duty API Collection - Summary

## Overview

This document summarizes the Postman collection created for testing the On Duty functionality in the Hikvision Attendance system.

## Files Created

1. **OnDuty_API_Collection.json**
   - A comprehensive Postman collection for testing the On Duty API endpoints
   - Includes authentication, CRUD operations, and proper environment variable usage

2. **OnDuty_API_Environment.json**
   - Environment variables for use with the collection
   - Includes placeholders for baseUrl, token, institutionId, userId, onDutyId, and date filters

3. **OnDuty_API_Documentation.md**
   - Detailed documentation on how to use the collection
   - Includes information on endpoints, request/response formats, and troubleshooting

## API Endpoints Included

1. **Authentication**
   - `POST /api/auth/login` - Get JWT token for API access

2. **On Duty Management**
   - `POST /api/institutions/:institutionId/users/:userId/on-duty` - Create On Duty record
   - `GET /api/institutions/:institutionId/users/:userId/on-duty` - Get user's On Duty records
   - `GET /api/institutions/:institutionId/on-duty` - Get institution's On Duty records
   - `PUT /api/institutions/:institutionId/on-duty/:onDutyId` - Update On Duty record
   - `DELETE /api/institutions/:institutionId/on-duty/:onDutyId` - Delete On Duty record

## How to Use

1. Import the collection and environment into Postman
2. Set up your environment variables (especially baseUrl)
3. Use the Login request to get a token
4. Copy the token to your environment
5. Use the On Duty endpoints as needed

## Notes

- All endpoints require authentication (JWT token)
- The collection uses environment variables for flexibility
- Date formats should be in ISO 8601 format (e.g., "2025-10-15T00:00:00.000Z")
- The collection includes proper error handling and validation

## Next Steps

1. Test the collection with your local or production environment
2. Update environment variables with your specific values
3. Extend the collection as needed for your specific use cases