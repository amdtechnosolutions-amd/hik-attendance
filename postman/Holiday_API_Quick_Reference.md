# Holiday API - Quick Reference

## 🔐 Base URL
```
http://localhost:4000/api
```

## 🎯 Quick Links

| Operation | Method | Endpoint |
|-----------|--------|----------|
| **Create Holiday** | POST | `/institutions/{institutionId}/holidays` |
| **Get All Holidays** | GET | `/institutions/{institutionId}/holidays` |
| **Get Holiday by ID** | GET | `/institutions/{institutionId}/holidays/{holidayId}` |
| **Update Holiday** | PUT | `/institutions/{institutionId}/holidays/{holidayId}` |
| **Delete Holiday** | DELETE | `/institutions/{institutionId}/holidays/{holidayId}` |

---

## 🚀 Quick Start Commands

### 1️⃣ Login
```bash
curl -X POST "http://localhost:4000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'
```

### 2️⃣ Create Holiday (Dec 1-2)
```bash
curl -X POST "http://localhost:4000/api/institutions/{institutionId}/holidays" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name":"Institution Holiday - Dec 1-2",
    "startDate":"2025-12-01T00:00:00.000Z",
    "endDate":"2025-12-02T23:59:59.999Z",
    "type":"institution-holiday",
    "showInAttendance":true
  }'
```

### 3️⃣ Create Holiday (Dec 20-22)
```bash
curl -X POST "http://localhost:4000/api/institutions/{institutionId}/holidays" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name":"Year-End Holiday - Dec 20-22",
    "startDate":"2025-12-20T00:00:00.000Z",
    "endDate":"2025-12-22T23:59:59.999Z",
    "type":"institution-holiday",
    "showInAttendance":true
  }'
```

### 4️⃣ Get All Holidays
```bash
curl -X GET "http://localhost:4000/api/institutions/{institutionId}/holidays" \
  -H "Authorization: Bearer {token}"
```

### 5️⃣ Get December Holidays
```bash
curl -X GET "http://localhost:4000/api/institutions/{institutionId}/holidays?startDate=2025-12-01&endDate=2025-12-31" \
  -H "Authorization: Bearer {token}"
```

### 6️⃣ Delete Holiday
```bash
curl -X DELETE "http://localhost:4000/api/institutions/{institutionId}/holidays/{holidayId}" \
  -H "Authorization: Bearer {token}"
```

---

## 📋 Query Parameters

### Get Holidays Filters

| Parameter | Values | Example |
|-----------|--------|---------|
| `startDate` | YYYY-MM-DD | `2025-12-01` |
| `endDate` | YYYY-MM-DD | `2025-12-31` |
| `type` | `institution-holiday`, `emergency-holiday`, `special-day` | `type=emergency-holiday` |
| `showOnly` | `true`, `false` | `showOnly=true` |

### Combined Filter Example
```
GET /institutions/{institutionId}/holidays?startDate=2025-12-01&endDate=2025-12-31&type=institution-holiday&showOnly=true
```

---

## 📊 Request/Response Examples

### ✅ Success Response
```json
{
  "success": true,
  "holiday": {
    "_id": "60f1a1b2c3d4e5f6a7b8c9d0",
    "institutionId": "68c160eae77b04e4b08ad66c",
    "name": "Year-End Holiday",
    "startDate": "2025-12-20T00:00:00.000Z",
    "endDate": "2025-12-22T23:59:59.999Z",
    "type": "institution-holiday",
    "description": "Annual holiday",
    "isActive": true,
    "showInAttendance": true,
    "createdBy": "60d1a2b3c4d5e6f7a8b9c0d2",
    "createdAt": "2025-12-18T10:30:00.000Z",
    "updatedAt": "2025-12-18T10:30:00.000Z"
  }
}
```

### ❌ Error Response
```json
{
  "success": false,
  "message": "Start date must be before end date"
}
```

---

## 🔑 Holiday Types

| Type | Purpose | Use Case |
|------|---------|----------|
| `institution-holiday` | Regular holidays | Annual holidays, festival holidays |
| `emergency-holiday` | Emergency closures | Unexpected facility closure |
| `special-day` | Special observance | Important dates not affecting attendance |

---

## 📍 Important Notes

✅ **Required Fields**:
- `name` - Holiday name
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)

✅ **Optional Fields**:
- `type` - defaults to `institution-holiday`
- `description` - Holiday description
- `showInAttendance` - defaults to `false`

✅ **Date Format**: Always use ISO 8601 with timezone
- ✅ `2025-12-20T00:00:00.000Z`
- ❌ `2025-12-20`

✅ **Permissions**: Institution Admin or Master Admin required

✅ **Soft Delete**: Deleted holidays are marked inactive (isActive=false)

---

## 🧪 Test Scenarios

### Scenario 1: Setup December 2025 Holidays
```
1. Create Dec 1-2 holiday → Save the holiday ID
2. Create Dec 20-22 holiday → Save the holiday ID
3. Get all holidays to verify
```

### Scenario 2: Emergency Closure
```
1. Create emergency holiday for Dec 25
2. Set showInAttendance=false (won't affect reports)
3. Later delete it when resolved
```

### Scenario 3: Modify Holiday Dates
```
1. Get specific holiday by ID
2. Update endDate to extend duration
3. Verify changes with GET request
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `Holiday_API_Documentation.md` | Complete API documentation |
| `Holiday_API_Collection.json` | Postman collection file |
| `Holiday_API_CURL_Examples.md` | All CURL command examples |
| `Holiday_API_Quick_Reference.md` | This file - Quick lookup |

---

## 🎯 Common Workflows

### Add Institution Holidays
```bash
# Dec 1-2
POST /institutions/{id}/holidays
{"name":"Dec 1-2","startDate":"2025-12-01T00:00:00.000Z","endDate":"2025-12-02T23:59:59.999Z","showInAttendance":true}

# Dec 20-22
POST /institutions/{id}/holidays
{"name":"Dec 20-22","startDate":"2025-12-20T00:00:00.000Z","endDate":"2025-12-22T23:59:59.999Z","showInAttendance":true}
```

### View All Holidays
```bash
GET /institutions/{id}/holidays?startDate=2025-12-01&endDate=2025-12-31
```

### Hide Holiday from Attendance
```bash
PUT /institutions/{id}/holidays/{id}
{"showInAttendance":false}
```

### Remove Holiday
```bash
DELETE /institutions/{id}/holidays/{id}
```

---

## 🔗 Related Endpoints

| Purpose | Endpoint |
|---------|----------|
| Login | `POST /auth/login` |
| Export Attendance | `GET /institutions/{id}/attendance/export` |
| Get Attendance | `GET /institutions/{id}/users-with-daily-attendance` |
| Consolidated Report | `GET /institutions/{id}/consolidated-monthly-report` |

