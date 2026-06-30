# Changes Made to Fix Attendance Calculation

## Issue
The attendance calculation functions in `userController.js` were using the global `User` and `Attendance` models imported at the top of the file instead of the institution-specific models provided by the middleware. This caused the attendance calculations to fetch data from the master database instead of the institution-specific database, resulting in incorrect or missing attendance data.

## Fixed Functions
1. `getUsersWithCurrentMonthAttendance` (lines 364-810)
2. `getUsersWithDailyAttendance` (lines 813-1082)
3. `getUsersWithMonthlyAttendanceSummary` (lines 1085-1338)
4. `getUsersWithMonthlyDailyStatusSummary` (lines 1341-1648)
5. `pushUserToDevice` (lines 318-361)

## Changes Made
For each function, we:
1. Added a line to get the institution-specific models from the request object:
   ```javascript
   const { models } = req.institutionDb;
   ```
2. Replaced all references to the global `User` model with `models.User`
3. Replaced all references to the global `Attendance` model with `models.Attendance`
4. Replaced all references to the global `Device` model with `models.Device`

## Testing
We created a test script (`test-attendance.js`) to verify that the functions are now correctly using the institution-specific models. The test output confirms that the functions are using the institution-specific models as expected.

## Future Considerations
1. All operations that handle institution-specific data should use the institution-specific models provided by the middleware.
2. The pattern of using `req.institutionDb.models` should be consistently applied across all controllers and services.
3. Consider adding more comprehensive tests to verify the functionality of these functions with actual database connections.