# Hikvision Attendance Dashboard API Documentation

This document provides comprehensive documentation for the Hikvision Attendance Dashboard API, which offers analytics and statistics for monitoring attendance patterns within an institution.

> **Important Note**: The API uses employee numbers to match attendance records with users. The attendance records are stored with employee numbers rather than direct user ID references.

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [Dashboard API](#dashboard-api)
4. [User Attendance Statistics API](#user-attendance-statistics-api)
5. [Using the Postman Collection](#using-the-postman-collection)
6. [Response Examples](#response-examples)

## Introduction

The Dashboard API provides comprehensive analytics for monitoring attendance patterns within an institution. It offers institution-wide statistics as well as detailed user-specific attendance data.

### Data Model

The API works with the following key data models:

1. **User**: Contains user information including name, employee number, and institution ID.
2. **Attendance**: Records attendance events with employee number, timestamp, and device information.
3. **Device**: Contains information about attendance devices.

The system uses employee numbers to link attendance records with users, rather than direct database references.

## Authentication

All API endpoints require authentication using JWT tokens.

### Login

```
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "admin@example.com",
  "password": "your_password"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "institution_admin"
  }
}
```

## Dashboard API

### Get Dashboard Data

```
GET /api/institutions/{institutionId}/dashboard
```

Retrieves comprehensive dashboard data for an institution, including attendance statistics, user counts, and analytics.

**Query Parameters:**

| Parameter | Type   | Required | Description                                           |
|-----------|--------|----------|-------------------------------------------------------|
| date      | string | No       | Specific date to view (YYYY-MM-DD format)             |
| period    | string | No       | Time period for statistics (day, week, month, year)   |

**Response:**

The response includes:

- Total user and device counts
- Today's attendance summary (present/absent counts and percentages)
- Period-based attendance data (day, week, month, or year)
- List of absent users
- List of late comers
- Hourly attendance trends
- Top punctual users
- Most consistent attendees

## User Attendance Statistics API

### Get User Attendance Stats

```
GET /api/institutions/{institutionId}/users/{userId}/attendance-stats
```

Retrieves detailed attendance statistics for a specific user.

**Query Parameters:**

| Parameter | Type   | Required | Description                                         |
|-----------|--------|----------|-----------------------------------------------------|
| period    | string | No       | Time period for statistics (day, week, month, year) |

**Response:**

The response includes:

- User details (name, employee number)
- Attendance percentage
- Days present/absent
- Average arrival time
- Late day count
- Daily attendance records with entry/exit times

## Using the Postman Collection

A Postman collection is provided to help you test and explore the API. Follow these steps to use it:

1. Import the `Hikvision_Dashboard_API.postman_collection.json` file into Postman
2. Set up environment variables:
   - `token`: JWT token obtained from the login endpoint
   - `institutionId`: ID of the institution to query
   - `userId`: ID of the user to query attendance statistics for
   - `date`: Date in YYYY-MM-DD format (for specific date queries)
   - `period`: Period to query (day, week, month, year)

3. Start with the Login request to obtain a JWT token
4. Use the Dashboard and User Attendance Statistics endpoints as needed

## Response Examples

### Dashboard Data Response

```json
{
  "totalUsers": 50,
  "totalDevices": 3,
  "todaySummary": {
    "date": "2023-05-15",
    "presentCount": 42,
    "absentCount": 8,
    "attendancePercentage": 84
  },
  "periodSummary": {
    "period": "month",
    "startDate": "2023-05-01",
    "endDate": "2023-05-31",
    "workingDays": 22,
    "data": [
      {
        "date": "2023-05-01",
        "count": 45,
        "percentage": 90
      },
      {
        "date": "2023-05-02",
        "count": 47,
        "percentage": 94
      }
      // Additional days...
    ]
  },
  "absentUsers": [
    {
      "name": "John Doe",
      "employeeNo": "EMP001"
    },
    {
      "name": "Jane Smith",
      "employeeNo": "EMP002"
    }
    // Additional absent users...
  ],
  "lateComers": [
    {
      "name": "Alice Johnson",
      "employeeNo": "EMP003",
      "arrivalTime": "2023-05-15T09:15:22.000Z"
    },
    {
      "name": "Bob Williams",
      "employeeNo": "EMP004",
      "arrivalTime": "2023-05-15T09:10:05.000Z"
    }
    // Additional late comers...
  ],
  "hourlyTrend": [
    {
      "hour": 0,
      "count": 0
    },
    {
      "hour": 1,
      "count": 0
    },
    // Hours 2-7 with count 0...
    {
      "hour": 8,
      "count": 35
    },
    {
      "hour": 9,
      "count": 7
    }
    // Additional hours...
  ],
  "topPunctualUsers": [
    {
      "name": "Charlie Brown",
      "employeeNo": "EMP005",
      "averageArrivalTime": "08:15",
      "daysPresent": 20
    },
    {
      "name": "Diana Prince",
      "employeeNo": "EMP006",
      "averageArrivalTime": "08:22",
      "daysPresent": 22
    }
    // Additional punctual users...
  ],
  "mostConsistentUsers": [
    {
      "name": "Eve Adams",
      "employeeNo": "EMP007",
      "daysPresent": 22
    },
    {
      "name": "Frank Miller",
      "employeeNo": "EMP008",
      "daysPresent": 21
    }
    // Additional consistent users...
  ]
}
```

### User Attendance Statistics Response

```json
{
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "employeeNo": "EMP001"
  },
  "periodSummary": {
    "period": "month",
    "startDate": "2023-05-01",
    "endDate": "2023-05-31",
    "workingDays": 22,
    "daysPresent": 20,
    "daysAbsent": 2,
    "attendancePercentage": 91,
    "lateDays": 3,
    "averageArrivalTime": "08:45"
  },
  "dailyAttendance": [
    {
      "date": "2023-05-01",
      "firstEntry": "2023-05-01T08:30:15.000Z",
      "lastExit": "2023-05-01T17:15:22.000Z",
      "duration": 8.8,
      "isLate": false,
      "entryCount": 4
    },
    {
      "date": "2023-05-02",
      "firstEntry": "2023-05-02T09:05:33.000Z",
      "lastExit": "2023-05-02T17:30:10.000Z",
      "duration": 8.4,
      "isLate": true,
      "entryCount": 2
    }
    // Additional days...
  ]
}
```

## Error Responses

All API endpoints return appropriate HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include a message field with details about the error:

```json
{
  "message": "User not found"
}
```

---

For additional support or questions, please contact the system administrator.