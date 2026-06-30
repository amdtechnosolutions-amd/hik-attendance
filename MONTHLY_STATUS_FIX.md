# Monthly Daily Attendance Status Fix

## Issue Description

The monthly-daily-attendance-status endpoint was returning empty data (`summaries: []`) for all dates, including past dates:

```
http://localhost:4000/api/institutions/68e0e148f633a16a99a9df2e/monthly-daily-attendance-status?month=10&year=2025
```

Response:
```json
{
    "success": true,
    "month": "10",
    "year": "2025",
    "excelDownload": "/reports/monthly_daily_status_68e0e148f633a16a99a9df2e_10_2025.xlsx",
    "pdfDownload": "/reports/monthly_daily_status_68e0e148f633a16a99a9df2e_10_2025.pdf",
    "summaries": []
}
```

## Root Cause

The `getUsersWithMonthlyDailyStatusSummary` function in `userController.js` was using the global `Institution` model imported at the top of the file to find the institution:

```javascript
const institution = await Institution.findById(institutionId);
```

This is inconsistent with the pattern used for other models in the same function (User and Attendance), which correctly use the institution-specific models from `req.institutionDb.models`.

The issue is that when the function tries to find an institution using the global Institution model, it's looking in the master database. However, the institution-specific data (including users and attendance records) is stored in the institution-specific database.

## Fix Applied

The fix changes the function to use the institution object already available in the middleware:

```javascript
const { models, institution } = req.institutionDb;
```

This ensures that the function is using the institution-specific data consistently throughout.

## Files Modified

1. `src/controllers/userController.js` - Modified the `getUsersWithMonthlyDailyStatusSummary` function to use the institution from middleware

## Testing

A test script (`test-monthly-status.js`) was created to verify the fix. The test mocks the request and response objects, including mock users and attendance data, and calls the fixed function.

## How to Apply the Fix

1. Run the test script to verify the fix:
   ```
   node test-monthly-status.js
   ```

2. Apply the fix to the original file:
   ```
   node fix-monthly-status.js
   ```

## Additional Debugging

Additional debugging logs were added to help identify issues:

1. Log when processing starts: `Processing monthly daily status for institution: ${institution.name}, month: ${month}, year: ${year}`
2. Log the number of users found: `Found ${users.length} users for institution ${institutionId}`
3. Log the date range for attendance search: `Searching for attendance records between ${startDate.toISOString()} and ${endDate.toISOString()}`
4. Log the number of attendance records found: `Found ${attendanceAggregate.length} attendance records`
5. Log when generating summaries: `Generating summaries for ${users.length} users with ${Object.keys(attendanceMap).length} attendance records`
6. Log when sending the response: `Sending response with ${summaries.length} user summaries`

These logs will help identify any remaining issues with the data flow.

## Future Considerations

1. Consider adding the Institution model to the institution-specific models in `createInstitutionModels` function in `dbService.js` if institution-specific data needs to be queried from the institution's database.

2. Review other functions in the codebase to ensure they are consistently using institution-specific models from `req.institutionDb.models` when working with institution-specific data.

3. Add more comprehensive error handling and logging to help diagnose similar issues in the future.