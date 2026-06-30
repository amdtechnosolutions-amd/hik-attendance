# On Duty Functionality - Files Overview

This document provides an overview of all files created or modified for the On Duty functionality.

## Core Implementation Files

### Models
- **src/models/OnDuty.js** - Database model for On Duty records

### Controllers
- **src/controllers/userController.js** - Modified to include On Duty controller functions and report integration

### Routes
- **src/routes.js** - Modified to add On Duty API endpoints

## Testing Files

### Postman Collections
- **postman/OnDuty_Collection.json** - Basic Postman collection for testing On Duty functionality
- **postman/OnDuty_Collection_Extended.json** - Extended collection with additional test cases
- **postman/OnDuty_Environment.json** - Environment variables for the Postman collections

### Documentation
- **postman/OnDuty_Documentation.md** - Detailed documentation on using the Postman collection
- **postman/README.md** - Overview of the Postman collections and On Duty functionality

### Scripts
- **scripts/test_on_duty.js** - Node.js script for testing On Duty functionality programmatically

### Demo
- **public/on_duty_demo.html** - HTML demo page for testing On Duty functionality through a web interface

## Documentation Files
- **README_ON_DUTY.md** - Comprehensive documentation of the On Duty functionality
- **ON_DUTY_FILES.md** - This file, listing all files related to the On Duty functionality

## Changes Made

### Added New Files
1. **src/models/OnDuty.js** - Created new model for On Duty records
2. **postman/OnDuty_Collection.json** - Created Postman collection
3. **postman/OnDuty_Collection_Extended.json** - Created extended Postman collection
4. **postman/OnDuty_Environment.json** - Created Postman environment
5. **postman/OnDuty_Documentation.md** - Created documentation
6. **postman/README.md** - Created README for Postman collections
7. **scripts/test_on_duty.js** - Created test script
8. **public/on_duty_demo.html** - Created demo page
9. **README_ON_DUTY.md** - Created comprehensive documentation
10. **ON_DUTY_FILES.md** - Created this file

### Modified Existing Files
1. **src/controllers/userController.js**:
   - Added controller functions for On Duty management
   - Modified report generation to include On Duty status
   - Added styling for On Duty cells in Excel and PDF reports
   - Added legends to explain On Duty status

2. **src/routes.js**:
   - Added API endpoints for On Duty management

## Implementation Details

### Database Schema
```javascript
const OnDutySchema = new Schema({
  institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  employeeNo: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### API Endpoints
1. `POST /institutions/:institutionId/users/:userId/on-duty` - Create On Duty record
2. `GET /institutions/:institutionId/users/:userId/on-duty` - Get user On Duty records
3. `GET /institutions/:institutionId/on-duty` - Get institution On Duty records
4. `PUT /institutions/:institutionId/on-duty/:onDutyId` - Update On Duty record
5. `DELETE /institutions/:institutionId/on-duty/:onDutyId` - Delete On Duty record

### Report Enhancements
1. Added "OD" column to Excel and PDF reports
2. Added color coding for On Duty cells (light green)
3. Added legends explaining the "OD" status
4. Added On Duty days to attendance calculations