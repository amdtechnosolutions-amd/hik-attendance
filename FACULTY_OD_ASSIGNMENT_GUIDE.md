# Faculty OD Assignment Guide

This guide explains how to use the automated script to assign 'On Duty' (OD) status to faculty members who were absent during a specific period.

## Prerequisites
- Node.js installed on the server.
- Access to the `hik-attendance` project directory.
- MongoDB connection string configured in `.env`.

## Bulk Assignment Script
The script `src/scripts/bulk_assign_od_from_report.js` identifies faculty members with no attendance punches, no leave records, and no existing OD records for working days in a specified range.

### How to use
1. **Navigate to the project root**:
   ```bash
   cd /home/amdtechno/projects/hik-attendance
   ```

2. **Run in Dry Run Mode** (Recommended):
   This will show you how many records *would* be created without actually modifying the database.
   ```bash
   node src/scripts/bulk_assign_od_from_report.js --dry-run
   ```

3. **Run in Live Mode**:
   This will create the `OnDuty` records in the database.
   ```bash
   node src/scripts/bulk_assign_od_from_report.js
   ```

### Configuration
The script is currently configured for:
- **Institution**: MNCVV (`68e0e148f633a16a99a9df2e`)
- **Period**: `2026-02-24` to `2026-03-23`
- **Description**: "Assigned based on consolidated report"

To change these, edit the variables at the top of `src/scripts/bulk_assign_od_from_report.js`.

### Logic for "Absent" Status
The script considers a day as "Absent" if:
1. It is NOT a Sunday.
2. It is NOT a Second Saturday (8th-14th).
3. There are ZERO attendance punches for the user on that day.
4. There is NO leave record for the user on that day.
5. There is NO existing OD record for the user on that day.

## Verification
After running the script, you can:
1. **Generate the Consolidated Report**: The 'A' statuses for the affected days will now show as 'OD'.
2. **Check Summary**: The `totalOnDuty` count for each faculty member will increase accordingly.
