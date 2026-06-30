# On Duty Upload - Testing & Verification Checklist

## 🧪 Pre-Testing Setup

- [ ] Server running on port 4000
- [ ] Database connected
- [ ] Authentication token ready
- [ ] Institution ID available
- [ ] Some users created in the system

---

## ✅ Testing Checklist

### Phase 1: Template Download

#### Test 1.1: Download Template (No Auth)
```bash
curl -X GET http://localhost:4000/api/institutions/{institutionId}/on-duty-template
```
- [ ] Status code: 200 OK
- [ ] File downloaded: OD_Upload_Template.xlsx
- [ ] File size: > 5KB
- [ ] Can open in Excel

#### Test 1.2: Template Content
- [ ] Header row: EmployeeNo, StartDate, EndDate, Description
- [ ] Headers have brown background
- [ ] Sample data included (3 rows)
- [ ] Instructions section present
- [ ] Column widths reasonable

---

### Phase 2: Basic Upload

#### Test 2.1: Upload Valid File (Single Record)
**Create Excel with:**
```
EmployeeNo  | StartDate    | EndDate      | Description
EMP001      | 2025-02-01   | 2025-02-03   | Test Conference
```

```bash
curl -X POST http://localhost:4000/api/institutions/{institutionId}/upload-on-duty \
  -H 'Authorization: Bearer {token}' \
  -F 'file=@test.xlsx'
```

- [ ] Status code: 200 OK
- [ ] Response: success = true
- [ ] summary.success = 1
- [ ] summary.failed = 0
- [ ] Record created in database

**Verify in Database:**
```bash
# Check OnDuty collection
db.ondutys.find({ employeeNo: 'EMP001' })
```
- [ ] Record exists
- [ ] Correct dates
- [ ] Correct description
- [ ] userId populated

#### Test 2.2: Upload Valid File (Multiple Records)
**Create Excel with 5 employees:**
```
EMP001, 2025-02-01, 2025-02-03, Conf1
EMP002, 2025-02-01, 2025-02-03, Conf1
EMP003, 2025-02-01, 2025-02-03, Conf1
EMP004, 2025-02-05, 2025-02-07, Conf2
EMP005, 2025-02-10, 2025-02-12, Conf3
```

- [ ] Status code: 200 OK
- [ ] summary.success = 5
- [ ] summary.failed = 0
- [ ] All 5 records in database

---

### Phase 3: Error Handling

#### Test 3.1: Missing File
```bash
curl -X POST http://localhost:4000/api/institutions/{institutionId}/upload-on-duty \
  -H 'Authorization: Bearer {token}'
```

- [ ] Status code: 400 Bad Request
- [ ] Error message: "No file provided"

#### Test 3.2: Missing Required Columns
**Excel with only:** EmployeeNo, StartDate

- [ ] Status code: 400 Bad Request
- [ ] Error: "Missing required columns: EndDate, Description"

#### Test 3.3: Invalid Employee Number
**Excel with:**
```
EmployeeNo  | StartDate    | EndDate      | Description
INVALID_EMP | 2025-02-01   | 2025-02-03   | Test
```

- [ ] Status code: 200 OK (partial success)
- [ ] summary.success = 0
- [ ] summary.failed = 1
- [ ] Error: "User not found for Employee No: INVALID_EMP"

#### Test 3.4: Invalid Date Format
**Excel with:**
```
EmployeeNo  | StartDate    | EndDate      | Description
EMP001      | 01/02/2025   | invalid      | Test
```

- [ ] summary.failed = 1
- [ ] Error mentions: "Invalid date format"

#### Test 3.5: Start Date > End Date
**Excel with:**
```
EmployeeNo  | StartDate    | EndDate      | Description
EMP001      | 2025-02-10   | 2025-02-01   | Test
```

- [ ] summary.failed = 1
- [ ] Error: "Start date must be before end date"

#### Test 3.6: Missing Required Fields
**Excel with:**
```
EmployeeNo  | StartDate    | EndDate      | Description
EMP001      | 2025-02-01   |              | Test
```

- [ ] summary.failed = 1
- [ ] Error mentions: "Missing Start Date, End Date, or Description"

#### Test 3.7: Partial Success
**Excel with mix of valid/invalid:**
```
EMP001      | 2025-02-01   | 2025-02-03   | Valid
INVALID_EMP | 2025-02-01   | 2025-02-03   | Invalid
EMP002      | 2025-02-05   | 2025-02-07   | Valid
```

- [ ] summary.success = 2
- [ ] summary.failed = 1
- [ ] Valid records created
- [ ] Error logged for invalid record

---

### Phase 4: Date Format Support

#### Test 4.1: YYYY-MM-DD Format
```
EMP001, 2025-02-01, 2025-02-03, Test
```
- [ ] Accepted
- [ ] Correct dates stored

#### Test 4.2: DD-MM-YYYY Format
```
EMP001, 01-02-2025, 03-02-2025, Test
```
- [ ] Accepted
- [ ] Correct dates stored

#### Test 4.3: MM/DD/YYYY Format
```
EMP001, 02/01/2025, 02/03/2025, Test
```
- [ ] Accepted
- [ ] Correct dates stored

---

### Phase 5: Database Verification

#### Test 5.1: Records Created with Correct Fields
Query database:
```javascript
db.ondutys.findOne({ employeeNo: 'EMP001' })
```

Check fields:
- [ ] institutionId: Correct
- [ ] userId: Valid ObjectId
- [ ] employeeNo: Correct
- [ ] startDate: Valid Date
- [ ] endDate: Valid Date
- [ ] description: Non-empty string
- [ ] createdAt: Present
- [ ] updatedAt: Present

#### Test 5.2: User Relation
```javascript
db.ondutys.aggregate([{
  $lookup: {
    from: "users",
    localField: "userId",
    foreignField: "_id",
    as: "user"
  }
}])
```

- [ ] userId correctly references User record
- [ ] User data populated
- [ ] Employee number matches

---

### Phase 6: API Integration

#### Test 6.1: Get OD Records After Upload
```bash
curl -X GET http://localhost:4000/api/institutions/{institutionId}/on-duty \
  -H 'Authorization: Bearer {token}'
```

- [ ] Status: 200 OK
- [ ] Returns array of OD records
- [ ] Recently uploaded records appear
- [ ] User details populated via populate()

#### Test 6.2: OD Record Details
- [ ] Record includes user name
- [ ] Record includes user employeeNo
- [ ] Dates in ISO format
- [ ] Description intact

---

### Phase 7: Report Integration

#### Test 7.1: Consolidated Report (After OD Upload)
```bash
curl -X GET 'http://localhost:4000/api/institutions/{institutionId}/consolidated-monthly-report?month=2&year=2025' \
  -H 'Authorization: Bearer {token}' \
  --output report.pdf
```

- [ ] PDF generated successfully
- [ ] No errors in console
- [ ] OD excluded from working day columns
- [ ] OD appears in "Weekend/Holiday Dates" section

#### Test 7.2: OD Appearance in Report
- [ ] OD employees show as present
- [ ] OD description visible
- [ ] Date formatted correctly
- [ ] Page layout intact

---

### Phase 8: File Handling

#### Test 8.1: Temporary File Cleanup
Monitor `uploads/` directory during upload:
- [ ] File appears during processing
- [ ] File deleted after completion
- [ ] No orphaned files remain

#### Test 8.2: Large File Upload
Create Excel with 100+ records:
- [ ] File uploaded successfully
- [ ] Processing completes
- [ ] All records created
- [ ] Response time reasonable (< 30 seconds)

#### Test 8.3: Various File Sizes
- [ ] Small file (5 records): Works
- [ ] Medium file (50 records): Works
- [ ] Large file (500+ records): Works
- [ ] File too large (> 10MB): Rejected with error

---

### Phase 9: Security Tests

#### Test 9.1: Authentication Required
```bash
curl -X POST http://localhost:4000/api/institutions/{institutionId}/upload-on-duty \
  -F 'file=@test.xlsx'
```

- [ ] Status: 401 Unauthorized (no auth header)

#### Test 9.2: Invalid Token
```bash
curl -X POST http://localhost:4000/api/institutions/{institutionId}/upload-on-duty \
  -H 'Authorization: Bearer invalid_token' \
  -F 'file=@test.xlsx'
```

- [ ] Status: 401 Unauthorized

#### Test 9.3: Template Download (No Auth Required)
- [ ] Can download without token
- [ ] Works for public access

---

### Phase 10: Edge Cases

#### Test 10.1: Empty File
Excel with just headers, no data:
- [ ] Status: 200 OK
- [ ] summary.success = 0
- [ ] summary.failed = 0
- [ ] Message: "Upload completed. 0 records created, 0 failed"

#### Test 10.2: Duplicate Records in Same Upload
```
EMP001, 2025-02-01, 2025-02-03, Conf
EMP001, 2025-02-01, 2025-02-03, Conf
```

- [ ] Both records created (duplicates allowed)
- [ ] summary.success = 2

#### Test 10.3: Overlapping Date Ranges
```
EMP001, 2025-02-01, 2025-02-10, Event1
EMP001, 2025-02-05, 2025-02-15, Event2
```

- [ ] Both records created (overlap allowed)
- [ ] summary.success = 2

#### Test 10.4: Very Long Description
Description with 500+ characters:
- [ ] Accepted
- [ ] Stored completely
- [ ] No truncation

#### Test 10.5: Special Characters in Description
Description: "Workshop @ Delhi #2025 (Official) - 50% discount!"
- [ ] Accepted
- [ ] Stored correctly
- [ ] No encoding issues

---

### Phase 11: Performance Tests

#### Test 11.1: Response Time (10 records)
```bash
time curl -X POST http://localhost:4000/api/institutions/{institutionId}/upload-on-duty \
  -H 'Authorization: Bearer {token}' \
  -F 'file=@test10.xlsx'
```

- [ ] Time: < 5 seconds

#### Test 11.2: Response Time (100 records)
- [ ] Time: < 15 seconds

#### Test 11.3: Concurrent Uploads
Upload 3 files simultaneously:
- [ ] All process successfully
- [ ] No race conditions
- [ ] All records created correctly

---

### Phase 12: Regression Tests

#### Test 12.1: Existing OD APIs Still Work
- [ ] GET all OD records: Works
- [ ] GET user OD records: Works
- [ ] Create OD manually: Works
- [ ] Update OD: Works
- [ ] Delete OD: Works

#### Test 12.2: Other Features Unaffected
- [ ] Attendance sync: Works
- [ ] User management: Works
- [ ] Reports: Work
- [ ] Dashboard: Works

---

## 📊 Test Results Summary

### Checklist Status
- Total Tests: 60+
- [ ] All tests passed
- [ ] No errors encountered
- [ ] Performance acceptable
- [ ] Documentation complete

### Issues Found
(List any issues here)
```
[ ] Issue 1: ...
[ ] Issue 2: ...
```

### Recommendations
(List any improvements)
```
[ ] Recommendation 1: ...
[ ] Recommendation 2: ...
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All tests passed
- [ ] Code reviewed
- [ ] Database migrations run
- [ ] Documentation updated
- [ ] Error logging configured
- [ ] Performance tested
- [ ] Security verified
- [ ] Backup created
- [ ] Rollback plan ready
- [ ] Team notified

---

## 📝 Test Run Log

| Test Date | Tester | Status | Notes |
|-----------|--------|--------|-------|
| 2025-01-01 | Dev Team | ✅ PASS | All tests successful |
| | | | |
| | | | |

---

## 🐛 Troubleshooting During Testing

### Problem: "ENOENT: no such file or directory"
**Solution:** Ensure `uploads/` directory exists
```bash
mkdir -p uploads
```

### Problem: "ValidationError: startDate is required"
**Solution:** Check date parsing is working correctly

### Problem: "Cast to ObjectId failed"
**Solution:** Verify institution ID is valid ObjectId format

### Problem: Timeout on large files
**Solution:** Increase timeout in Express app.js:
```javascript
app.use(express.json({ limit: '50mb' }));
```

---

## ✅ Final Checklist

- [ ] Template download works
- [ ] Single record upload works
- [ ] Batch upload works
- [ ] Error handling works
- [ ] Date formats work
- [ ] Database records created correctly
- [ ] API integration works
- [ ] Reports show OD correctly
- [ ] File cleanup works
- [ ] Security verified
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Ready for production

---

## 📞 Support

Contact development team if tests fail. Include:
- Test phase number
- Exact error message
- Steps to reproduce
- Server logs
- File used for testing