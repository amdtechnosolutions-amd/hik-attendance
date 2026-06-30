# Holiday API - Complete Documentation & Postman Collection

## 📁 Files Included

This directory contains complete documentation and examples for the Holiday Management API:

### 📄 Documentation Files
1. **Holiday_API_Documentation.md** - Comprehensive API documentation
   - Prerequisites and setup
   - All endpoints with request/response examples
   - Error handling
   - Testing workflow
   - Troubleshooting guide

2. **Holiday_API_Quick_Reference.md** - Quick lookup guide
   - Fast endpoint reference
   - Quick start commands
   - Common workflows
   - Test scenarios

3. **Holiday_API_CURL_Examples.md** - CURL command examples
   - All operations with CURL
   - Complete workflow script
   - Filter examples
   - Error response examples

### 🔧 Postman Files
1. **Holiday_API_Collection.json** - Postman collection
   - Import this into Postman
   - Pre-configured requests for all operations
   - Example request bodies
   - Response examples

---

## 🚀 Quick Start

### Step 1: Import into Postman
1. Open Postman
2. Click **Import** → Select `Holiday_API_Collection.json`
3. Create new environment with these variables:
   ```
   baseUrl = http://localhost:4000
   token = (get from login endpoint)
   institutionId = your_institution_id
   holidayId = specific_holiday_id
   ```

### Step 2: Authenticate
1. Run **Login** request to get token
2. Copy token to environment variable `{{token}}`

### Step 3: Create Holidays
Run these requests in order:
- **1. Create Dec 1-2 Holiday**
- **2. Create Dec 20-22 Holiday**
- **3. Get All Holidays** (verify creation)

### Step 4: Test Operations
- **Update Holiday** (modify dates/description)
- **Delete Holiday** (soft delete)

---

## 📊 API Endpoints Summary

| Operation | Method | URL |
|-----------|--------|-----|
| Create Holiday | POST | `/api/institutions/{id}/holidays` |
| Get All Holidays | GET | `/api/institutions/{id}/holidays` |
| Get Holiday by ID | GET | `/api/institutions/{id}/holidays/{id}` |
| Update Holiday | PUT | `/api/institutions/{id}/holidays/{id}` |
| Delete Holiday | DELETE | `/api/institutions/{id}/holidays/{id}` |

---

## 💾 Minimal Request Examples

### Create Institution Holiday
```bash
POST /api/institutions/{{institutionId}}/holidays
Authorization: Bearer {{token}}

{
  "name": "Year-End Holiday",
  "startDate": "2025-12-20T00:00:00.000Z",
  "endDate": "2025-12-22T23:59:59.999Z",
  "type": "institution-holiday",
  "showInAttendance": true
}
```

### Get Holidays with Filters
```bash
GET /api/institutions/{{institutionId}}/holidays?startDate=2025-12-01&endDate=2025-12-31&type=institution-holiday
Authorization: Bearer {{token}}
```

### Update Holiday
```bash
PUT /api/institutions/{{institutionId}}/holidays/{{holidayId}}
Authorization: Bearer {{token}}

{
  "showInAttendance": false
}
```

### Delete Holiday
```bash
DELETE /api/institutions/{{institutionId}}/holidays/{{holidayId}}
Authorization: Bearer {{token}}
```

---

## 📋 Response Format

### Success Response
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

### Error Response
```json
{
  "success": false,
  "message": "Error description here"
}
```

---

## 🎯 Key Features

✅ **Multi-day holidays** - Support for date ranges
✅ **Holiday types** - Institution, Emergency, Special observance
✅ **Flexible visibility** - Control attendance report inclusion
✅ **Soft delete** - Safe deletion with audit trail
✅ **Filtering** - Query by date range, type, and status
✅ **Audit tracking** - Created/Updated timestamps and creator info

---

## 🔐 Authentication

All endpoints (except login) require Bearer token:
```
Authorization: Bearer {your_jwt_token}
```

Get token from login endpoint:
```bash
POST /api/auth/login
{
  "username": "admin",
  "password": "password"
}
```

---

## 🧪 Testing Guide

### Basic Test Flow
1. **Login** → Get token
2. **Create** → Add holiday (save ID)
3. **List** → Verify creation
4. **Filter** → Test query parameters
5. **Update** → Modify fields
6. **Verify** → Check updates
7. **Delete** → Remove holiday
8. **Verify** → Confirm deletion

### Recommended Test Data

**Institution Holidays (Dec 2025)**:
- Dec 1-2: Institution holiday
- Dec 20-22: Year-end holiday

**Emergency Holiday**:
- Dec 25: Emergency closure

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check token is valid and not expired |
| 400 Bad Request | Verify date format is ISO 8601 (YYYY-MM-DDTHH:MM:SS.sssZ) |
| 404 Not Found | Confirm holiday ID and institution ID are correct |
| Duplicate holidays | Check if date range overlaps with existing holidays |

---

## 📚 Additional Resources

- **Complete API Docs**: See `Holiday_API_Documentation.md`
- **CURL Examples**: See `Holiday_API_CURL_Examples.md`
- **Quick Reference**: See `Holiday_API_Quick_Reference.md`
- **Postman Collection**: Import `Holiday_API_Collection.json`

---

## 🔗 Integration with Attendance

When `showInAttendance=true`, the holiday:
- ✅ Appears in consolidated attendance reports
- ✅ Excluded from working day calculations
- ✅ Marked as "Holiday" status for employees
- ✅ Does not require attendance records

When `showInAttendance=false`, the holiday:
- ❌ Does NOT appear in reports
- ❌ Does NOT affect calculations
- ❌ Used for internal tracking only (emergency closures)

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review complete documentation files
3. Test with CURL examples
4. Verify Postman collection setup

---

## 📝 Changelog

**v1.0** - Initial release
- CRUD operations for holidays
- Filter and query support
- Soft delete functionality
- Complete documentation and examples
