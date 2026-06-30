# Holiday API - CURL Examples

Complete CURL command examples for all Holiday API operations.

## Prerequisites

```bash
export BASE_URL="http://localhost:4000"
export TOKEN="your_jwt_token_here"
export INSTITUTION_ID="68c160eae77b04e4b08ad66c"
export HOLIDAY_ID="60f1a1b2c3d4e5f6a7b8c9d0"
```

## 1. Login (Get Token)

```bash
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60d1a2b3c4d5e6f7a8b9c0d2",
    "username": "admin",
    "role": "institution_admin"
  }
}
```

---

## 2. Create Holiday

### Create Institution Holiday (Dec 1-2)

```bash
curl -X POST "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Institution Holiday - Dec 1-2",
    "startDate": "2025-12-01T00:00:00.000Z",
    "endDate": "2025-12-02T23:59:59.999Z",
    "type": "institution-holiday",
    "description": "Annual institution holiday",
    "showInAttendance": true
  }'
```

### Create Year-End Holiday (Dec 20-22)

```bash
curl -X POST "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Year-End Holiday - Dec 20-22",
    "startDate": "2025-12-20T00:00:00.000Z",
    "endDate": "2025-12-22T23:59:59.999Z",
    "type": "institution-holiday",
    "description": "Annual year-end holiday",
    "showInAttendance": true
  }'
```

### Create Emergency Holiday (Single Day)

```bash
curl -X POST "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Emergency Closure",
    "startDate": "2025-12-25T00:00:00.000Z",
    "endDate": "2025-12-25T23:59:59.999Z",
    "type": "emergency-holiday",
    "description": "Unexpected facility closure",
    "showInAttendance": false
  }'
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "holiday": {
    "_id": "60f1a1b2c3d4e5f6a7b8c9d0",
    "institutionId": "68c160eae77b04e4b08ad66c",
    "name": "Year-End Holiday - Dec 20-22",
    "startDate": "2025-12-20T00:00:00.000Z",
    "endDate": "2025-12-22T23:59:59.999Z",
    "type": "institution-holiday",
    "description": "Annual year-end holiday",
    "isActive": true,
    "showInAttendance": true,
    "createdBy": "60d1a2b3c4d5e6f7a8b9c0d2",
    "createdAt": "2025-12-18T10:30:00.000Z",
    "updatedAt": "2025-12-18T10:30:00.000Z"
  }
}
```

---

## 3. Get Holidays

### Get All Holidays

```bash
curl -X GET "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays" \
  -H "Authorization: Bearer $TOKEN"
```

### Get December 2025 Holidays

```bash
curl -X GET "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays?startDate=2025-12-01&endDate=2025-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Emergency Holidays Only

```bash
curl -X GET "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays?type=emergency-holiday" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Institution Holidays Only

```bash
curl -X GET "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays?type=institution-holiday" \
  -H "Authorization: Bearer $TOKEN"
```

### Get Only Active Holidays (showInAttendance=true)

```bash
curl -X GET "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays?showOnly=true" \
  -H "Authorization: Bearer $TOKEN"
```

### Complex Filter (Dec 2025 + Institution Holidays + Show in Attendance)

```bash
curl -X GET "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays?startDate=2025-12-01&endDate=2025-12-31&type=institution-holiday&showOnly=true" \
  -H "Authorization: Bearer $TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "holidays": [
    {
      "_id": "60f1a1b2c3d4e5f6a7b8c9d0",
      "institutionId": "68c160eae77b04e4b08ad66c",
      "name": "Institution Holiday - Dec 1-2",
      "startDate": "2025-12-01T00:00:00.000Z",
      "endDate": "2025-12-02T23:59:59.999Z",
      "type": "institution-holiday",
      "description": "Annual institution holiday",
      "isActive": true,
      "showInAttendance": true,
      "createdBy": "60d1a2b3c4d5e6f7a8b9c0d2",
      "createdAt": "2025-11-18T10:30:00.000Z",
      "updatedAt": "2025-11-18T10:30:00.000Z"
    },
    {
      "_id": "60f1a1b2c3d4e5f6a7b8c9d1",
      "institutionId": "68c160eae77b04e4b08ad66c",
      "name": "Year-End Holiday - Dec 20-22",
      "startDate": "2025-12-20T00:00:00.000Z",
      "endDate": "2025-12-22T23:59:59.999Z",
      "type": "institution-holiday",
      "description": "Annual year-end holiday",
      "isActive": true,
      "showInAttendance": true,
      "createdBy": "60d1a2b3c4d5e6f7a8b9c0d2",
      "createdAt": "2025-11-18T10:30:00.000Z",
      "updatedAt": "2025-11-18T10:30:00.000Z"
    }
  ]
}
```

---

## 4. Get Holiday by ID

```bash
curl -X GET "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays/$HOLIDAY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "holiday": {
    "_id": "60f1a1b2c3d4e5f6a7b8c9d0",
    "institutionId": "68c160eae77b04e4b08ad66c",
    "name": "Year-End Holiday - Dec 20-22",
    "startDate": "2025-12-20T00:00:00.000Z",
    "endDate": "2025-12-22T23:59:59.999Z",
    "type": "institution-holiday",
    "description": "Annual year-end holiday",
    "isActive": true,
    "showInAttendance": true,
    "createdBy": "60d1a2b3c4d5e6f7a8b9c0d2",
    "createdAt": "2025-11-18T10:30:00.000Z",
    "updatedAt": "2025-11-18T10:30:00.000Z"
  }
}
```

---

## 5. Update Holiday

### Update Holiday Name and Dates

```bash
curl -X PUT "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays/$HOLIDAY_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Extended Year-End Holiday",
    "endDate": "2025-12-25T23:59:59.999Z"
  }'
```

### Toggle showInAttendance Flag

```bash
curl -X PUT "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays/$HOLIDAY_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "showInAttendance": false
  }'
```

### Update Description

```bash
curl -X PUT "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays/$HOLIDAY_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "description": "Updated description for the holiday"
  }'
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "holiday": {
    "_id": "60f1a1b2c3d4e5f6a7b8c9d0",
    "institutionId": "68c160eae77b04e4b08ad66c",
    "name": "Extended Year-End Holiday",
    "startDate": "2025-12-20T00:00:00.000Z",
    "endDate": "2025-12-25T23:59:59.999Z",
    "type": "institution-holiday",
    "description": "Annual year-end holiday",
    "isActive": true,
    "showInAttendance": true,
    "createdBy": "60d1a2b3c4d5e6f7a8b9c0d2",
    "createdAt": "2025-11-18T10:30:00.000Z",
    "updatedAt": "2025-12-18T14:45:00.000Z"
  }
}
```

---

## 6. Delete Holiday (Soft Delete)

```bash
curl -X DELETE "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays/$HOLIDAY_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Holiday deleted"
}
```

---

## Complete Workflow Script

```bash
#!/bin/bash

# Set variables
BASE_URL="http://localhost:4000"
USERNAME="admin"
PASSWORD="your_password"
INSTITUTION_ID="68c160eae77b04e4b08ad66c"

# 1. Login and get token
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"$USERNAME\",
    \"password\": \"$PASSWORD\"
  }")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "✅ Token: $TOKEN"

# 2. Create Dec 1-2 Holiday
echo "📅 Creating Dec 1-2 holiday..."
curl -s -X POST "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Institution Holiday - Dec 1-2",
    "startDate": "2025-12-01T00:00:00.000Z",
    "endDate": "2025-12-02T23:59:59.999Z",
    "type": "institution-holiday",
    "showInAttendance": true
  }' | jq .

# 3. Create Dec 20-22 Holiday
echo "📅 Creating Dec 20-22 holiday..."
curl -s -X POST "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Year-End Holiday - Dec 20-22",
    "startDate": "2025-12-20T00:00:00.000Z",
    "endDate": "2025-12-22T23:59:59.999Z",
    "type": "institution-holiday",
    "showInAttendance": true
  }' | jq .

# 4. Get all December holidays
echo "📋 Fetching all December holidays..."
curl -s -X GET "$BASE_URL/api/institutions/$INSTITUTION_ID/holidays?startDate=2025-12-01&endDate=2025-12-31" \
  -H "Authorization: Bearer $TOKEN" | jq .

echo "✅ Workflow completed!"
```

---

## Error Responses

### 401 Unauthorized (Missing or Invalid Token)
```json
{
  "success": false,
  "message": "No token, authorization denied"
}
```

### 400 Bad Request (Invalid Dates)
```json
{
  "success": false,
  "message": "Start date must be before end date"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Holiday not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Error message from server"
}
```

---

## Tips

- Always use ISO 8601 format for dates: `YYYY-MM-DDTHH:MM:SS.sssZ`
- Use `showInAttendance: true` to include holidays in attendance calculations
- Use `showInAttendance: false` for emergency closures not affecting attendance
- Soft delete is used - deleted holidays are marked inactive but not permanently removed
- Filter by `type` to distinguish between institution and emergency holidays
- Use query parameters to filter results efficiently
