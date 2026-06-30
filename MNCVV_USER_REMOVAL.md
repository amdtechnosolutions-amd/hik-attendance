# MNCVV User Removal and Database Safety Guide

## Objective

The objective of this document is to detail the safe procedure utilized to remove specific users from the `ves_mncvv` database while ensuring zero data loss or interference with other active user data.

### Target Users for Removal

#### Batch 1 (Previous)
- **MNCVV85** - NAGALAKSHMI
- **MNCVV110** - NIVATHAR
- **MNCVV121** - RAMA.K

#### Batch 2 (June 1, 2026)
- **MNCVV017** - Smt K.Susitra (Employee No: `017`)
- **MNCVV045** - Smt. K.Nalini (Employee No: `045`)

#### Batch 3 (June 1, 2026)
- **MNCVV098** - PADMAKARTHIKA K (Employee No: `98`)

---

## Database Safety Measures

To strictly modify only the data we intend to, the following guidelines were implemented:

1. **Target Identification (Exact Match Validation)**
   Instead of using broad names which could mistakenly match similar users, we exactly pinpointed the users based on their unique 24-character Object IDs in the database:
   - `68df935de29a173206e204e5` (85: Nagalakshmi)
   - `68df93e7e29a173206e204f8` (110: NIVETHA R)
   - `68df93e7e29a173206e20502` (121: Rama.k)
   - `68df935be29a173206e204b5` (17: Smt K.Susitra)
   - `68df935de29a173206e204ca` (45: Smt. K.Nalini)
   - `68df93e7e29a173206e204f0` (98: PADMAKARTHIKA K)

2. **Isolated Deletions**
   Deletions were meticulously executed to exclusively target records assigned precisely to these IDs:
   - Within the **users** collection (`_id` equals the Target ID).
   - Within **relational collections** (e.g., `onduties`, `attendances`, `leaves`, `permissions`, `teachers`), relying strictly on exact `userId` match or exact `employeeNo` match.

3. **Dry Run (Read-Only Scan)**
   Prior to any deletion execution, a complete scan of the `ves_mncvv` database was performed. This verified what exactly was about to be deleted without issuing any write commands.

---

## Deletion Execution Summary

### Batch 1 Execution
A dedicated script (`scripts/remove_mncvv_users.js`) was created and executed to systematically enforce these rules:
- **Deleted Users:** `3` users securely removed from the `users` collection.
- **Deleted Related Data:** `3` mapped records securely removed from the `onduties` collection.
- **Affected Other Data:** `0` records.

### Batch 2 Execution (June 1, 2026)
A dedicated script (`scratch/remove_mncvv_users_045_017.js`) was created and executed:
- **Target Users:**
  - **Smt K.Susitra (017)**: 1 User, 3 Onduty records, 2199 Attendance records
  - **Smt. K.Nalini (045)**: 1 User, 2048 Attendance records, 1 Permission record
- **Execution Results:**
  - **Deleted Users:** `2` users securely removed from the `users` collection.
  - **Deleted Related Data:**
    - `3` mapped records securely removed from the `onduties` collection.
    - `4247` mapped records securely removed from the `attendances` collection.
    - `1` mapped record securely removed from the `permissions` collection.
  - **Affected Other Data:** `0` records.

### Batch 3 Execution (June 1, 2026 - User 98)
A dedicated script (`scratch/delete_user_98.js`) was created and executed:
- **Target User:** **PADMAKARTHIKA K (098 / 98)** (ID: `68df93e7e29a173206e204f0`)
- **Execution Results:**
  - **Deleted Users:** `1` user securely removed from the `users` collection.
  - **Deleted Related Data:**
    - `1761` mapped records securely removed from the `attendances` collection.
  - **Affected Other Data:** `0` records.

> **Status:** All requested users have been entirely purged from the system database only, leaving the hardware devices completely unaffected. The database integrity is preserved.
