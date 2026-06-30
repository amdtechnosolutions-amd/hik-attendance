import express from 'express';
import authController from './controllers/authController.js';
import masterController from './controllers/masterController.js';
import institutionController from './controllers/institutionController.js';
import deviceController from './controllers/deviceController.js';
import userController, {
  downloadUsersExcel,
  getAllTeachers,
  updateSeniority,
  uploadSeniorityExcel,
  syncFaceImages,
  getUsersWithCurrentMonthAttendance,
} from './controllers/userController.js';
import consolidatedReportController from './controllers/consolidatedReportController.js';
import onDutyController, { uploadOnDutyExcel, downloadOnDutyTemplate, deleteOnDutyByDates } from './controllers/onDutyController.js';
import attendanceController, { uploadManualAttendanceExcel, downloadManualAttendanceTemplate } from './controllers/attendanceController.js';
import dashboardController, { getInstitutionDashboard } from './controllers/dashboardController.js';
import leaveController, {
  createLeave,
  getLeaveRequests,
  getUserLeaves,
  approveLeave,
  rejectLeave,
  deleteLeave,
  downloadLeaveTemplate,
  uploadLeaveExcel,
  createPermission,
  getPermissionRequests,
  approvePermission,
  rejectPermission,
  deletePermission,
  downloadPermissionTemplate,
  uploadPermissionExcel,
  getInstitutionPermissionSummary,
  getInstitutionLeaveSummary
} from './controllers/leaveController.js';
import compOffController, {
  createCompOffManual,
  createCompOffAutomatic,
  getCompOffRecords,
  getUserCompOffBalance,
  useCompOff,
  cancelCompOff,
  deleteCompOff,
  downloadCompOffTemplate,
  uploadCompOffExcel
} from './controllers/compOffController.js';
import emailController from './controllers/emailController.js';
import compOffReportController, {
  getMonthlyCompOffReport,
  getInstitutionCompOffSummary,
  getCompOffHistoryForUser
} from './controllers/compOffReportController.js';
import holidayController, {
  createHoliday,
  getHolidays,
  getHolidayById,
  updateHoliday,
  deleteHoliday
} from './controllers/holidayController.js';
import compOffAssignmentController, {
  assignCompOffToFaculties,
  getFacultyCompOffAssignments,
  adjustCompOffAssignment
} from './controllers/compOffAssignmentController.js';
import { requireAuth, requireRole } from './middlewares/auth.js';
import { setupInstitutionDb } from './middlewares/dbConnection.js';
import multer from 'multer';
const router = express.Router();
const upload = multer({ dest: 'uploads/' });
// ---- AUTH ----
router.post('/auth/login', authController.login);
// Bootstrap (create first master, no auth required if none exists)
router.post('/masters/bootstrap', masterController.bootstrapMaster);

// ---- MASTER CRUD ----
router.post('/masters', requireAuth, requireRole('master'), masterController.createMaster);
router.get('/masters', requireAuth, requireRole('master'), masterController.listMasters);
router.put('/masters/:id', requireAuth, requireRole('master'), masterController.updateMaster);
router.delete('/masters/:id', requireAuth, requireRole('master'), masterController.deleteMaster);

// ---- INSTITUTION CRUD ----
router.post('/institutions', requireAuth, requireRole('master'), institutionController.createInstitution);
router.get('/institutions', requireAuth, requireRole('master'), institutionController.listInstitutions);
router.put('/institutions/:id', requireAuth, requireRole('master'), institutionController.updateInstitution);
router.delete('/institutions/:id', requireAuth, requireRole('master'), institutionController.deleteInstitution);

// ---- Institution-specific (admins) ----
// Add setupInstitutionDb middleware to all institution-specific routes
router.post('/institutions/:institutionId/devices', requireAuth, requireRole('institution_admin'), setupInstitutionDb, deviceController.createDevice);
router.get('/institutions/:institutionId/devices', requireAuth, setupInstitutionDb, deviceController.listDevices);

router.post('/institutions/:institutionId/users', requireAuth, requireRole(['institution_admin']), setupInstitutionDb, userController.addUser);
router.post('/device-user', requireAuth, userController.createDeviceUser);
router.get('/institutions/:institutionId/users', requireAuth, setupInstitutionDb, userController.listUsers);
router.get('/institutions/:institutionId/users-dropdown', setupInstitutionDb, userController.getUsersForDropdown);
router.post('/institutions/push-user-device', requireAuth, requireRole(['institution_admin']), setupInstitutionDb, userController.pushUserToDevice);
router.post('/institutions/:institutionId/import-users-device', requireAuth, requireRole(['institution_admin']), setupInstitutionDb, userController.importUsersFromDevice);
router.get('/institutions/:institutionId/users-with-attendance',
  // requireRole(['institution_admin', 'superadmin']), 
  setupInstitutionDb, getUsersWithCurrentMonthAttendance);
router.get(
  '/institutions/:institutionId/users-with-current-month-attendance',
  setupInstitutionDb, getUsersWithCurrentMonthAttendance
);
router.get(
  '/institutions/:institutionId/users-with-daily-attendance',
  // requireRole(['institution_admin', 'superadmin']),
  setupInstitutionDb, userController.getUsersWithDailyAttendance
);

router.get(
  '/institutions/:institutionId/users-with-daily-attendance-list',
  setupInstitutionDb, userController.getUsersWithDailyAttendanceList
);
router.get(
  '/institutions/:institutionId/users-with-monthly-attendance-summary',
  // requireRole(['institution_admin', 'superadmin']), // add roles as needed
  setupInstitutionDb, userController.getUsersWithMonthlyAttendanceSummary
);
router.get('/institutions/:institutionId/monthly-daily-attendance-status', setupInstitutionDb, userController.getUsersWithMonthlyDailyStatusSummary);

// New consolidated monthly attendance report endpoint
router.get('/institutions/:institutionId/consolidated-monthly-report', setupInstitutionDb, consolidatedReportController.getConsolidatedMonthlyAttendanceReport);

// New consolidated report WITH actual IN/OUT times per day (does not affect the above)
router.get('/institutions/:institutionId/consolidated-monthly-report-with-time', setupInstitutionDb, consolidatedReportController.getConsolidatedMonthlyReportWithTime);


router.post('/institutions/:institutionId/attendance/sync-device', requireAuth, setupInstitutionDb, attendanceController.syncFromDevice);
router.get('/institutions/:institutionId/attendance/sync-job-status', requireAuth, setupInstitutionDb, attendanceController.getSyncJobStatus);
router.get('/institutions/:institutionId/attendance/export', requireAuth, setupInstitutionDb, attendanceController.exportAttendanceExcel);

// Manual attendance routes
router.get(
  '/institutions/:institutionId/manual-attendance-template',
  downloadManualAttendanceTemplate
);

router.post(
  '/attendance/manual-entry',
  requireAuth,
  attendanceController.createManualEntry
);

router.post(
  '/institutions/:institutionId/upload-manual-attendance',
  requireAuth,
  setupInstitutionDb,
  upload.single('file'),
  uploadManualAttendanceExcel
);

router.get(
  '/institutions/:institutionId/manual-attendance',
  requireAuth,
  setupInstitutionDb,
  attendanceController.listManualAttendance
);

router.delete(
  '/institutions/:institutionId/manual-attendance/:id',
  requireAuth,
  setupInstitutionDb,
  attendanceController.deleteManualAttendance
);


// ✅ Get all teachers (sorted by seniority)
router.get(
  "/institutions/:institutionId/teachers",
  requireAuth,
  setupInstitutionDb,
  getAllTeachers
);
router.get("/institutions/:institutionId/users/download", setupInstitutionDb, downloadUsersExcel);

// ✅ Update seniority number manually
router.put(
  "/institutions/:institutionId/users/:userId/seniority",
  requireAuth,
  setupInstitutionDb,
  updateSeniority
);
router.post(
  '/institutions/:institutionId/upload-seniority',
  setupInstitutionDb,
  upload.single('file'),
  uploadSeniorityExcel
);

// Sync face images from Hikvision device
router.post(
  '/institutions/:institutionId/sync-face-images',
  requireAuth,
  setupInstitutionDb,
  syncFaceImages
);

// Dashboard APIs
router.get(
  '/institutions/:institutionId/dashboard',
  requireAuth,
  setupInstitutionDb,
  getInstitutionDashboard
);

router.get(
  '/institutions/:institutionId/users/:userId/attendance-stats',
  requireAuth,
  setupInstitutionDb,
  dashboardController.getUserAttendanceStats
);

// On Duty Management Routes
router.post(
  '/institutions/:institutionId/on-duty',
  requireAuth,
  setupInstitutionDb,
  onDutyController.createOnDuty
);

router.get(
  '/institutions/:institutionId/users/:userId/on-duty',
  requireAuth,
  setupInstitutionDb,
  onDutyController.getUserOnDuty
);

router.get(
  '/institutions/:institutionId/on-duty',
  requireAuth,
  setupInstitutionDb,
  onDutyController.getInstitutionOnDuty
);

router.get(
  '/institutions/:institutionId/on-duty-summary',
  requireAuth,
  setupInstitutionDb,
  onDutyController.getInstitutionOnDutySummary
);

router.put(
  '/institutions/:institutionId/on-duty/:onDutyId',
  requireAuth,
  setupInstitutionDb,
  onDutyController.updateOnDuty
);

router.delete(
  '/institutions/:institutionId/on-duty/:onDutyId',
  requireAuth,
  setupInstitutionDb,
  onDutyController.deleteOnDuty
);

// On Duty file upload and template routes
router.get(
  '/institutions/:institutionId/on-duty-template',
  downloadOnDutyTemplate
);

router.post(
  '/institutions/:institutionId/upload-on-duty',
  requireAuth,
  setupInstitutionDb,
  upload.single('file'),
  uploadOnDutyExcel
);

// Delete On Duty records by date range
router.post(
  '/institutions/:institutionId/delete-on-duty-by-dates',
  requireAuth,
  setupInstitutionDb,
  deleteOnDutyByDates
);

// ===== LEAVE MANAGEMENT ROUTES =====
// Create leave request
router.post(
  '/institutions/:institutionId/leaves',
  requireAuth,
  setupInstitutionDb,
  createLeave
);

// Get all leave requests for institution
router.get(
  '/institutions/:institutionId/leaves',
  requireAuth,
  setupInstitutionDb,
  getLeaveRequests
);

router.get(
  '/institutions/:institutionId/leave-summary',
  requireAuth,
  setupInstitutionDb,
  getInstitutionLeaveSummary
);

// Get leave requests for specific user
router.get(
  '/institutions/:institutionId/users/:userId/leaves',
  requireAuth,
  setupInstitutionDb,
  getUserLeaves
);

// Approve leave request
router.put(
  '/institutions/:institutionId/leaves/:leaveId/approve',
  requireAuth,
  setupInstitutionDb,
  approveLeave
);

// Reject leave request
router.put(
  '/institutions/:institutionId/leaves/:leaveId/reject',
  requireAuth,
  setupInstitutionDb,
  rejectLeave
);

// Delete leave request
router.delete(
  '/institutions/:institutionId/leaves/:leaveId',
  requireAuth,
  setupInstitutionDb,
  deleteLeave
);

// Download leave template
router.get(
  '/institutions/:institutionId/leave-template',
  downloadLeaveTemplate
);

// Upload leave requests from Excel
router.post(
  '/institutions/:institutionId/upload-leaves',
  requireAuth,
  setupInstitutionDb,
  upload.single('file'),
  uploadLeaveExcel
);

// ===== PERMISSION MANAGEMENT ROUTES =====
// Create permission request
router.post(
  '/institutions/:institutionId/permissions',
  requireAuth,
  setupInstitutionDb,
  createPermission
);

// Get all permission requests for institution
router.get(
  '/institutions/:institutionId/permissions',
  requireAuth,
  setupInstitutionDb,
  getPermissionRequests
);

router.get(
  '/institutions/:institutionId/permission-summary',
  requireAuth,
  setupInstitutionDb,
  getInstitutionPermissionSummary
);

// Approve permission request
router.put(
  '/institutions/:institutionId/permissions/:permissionId/approve',
  requireAuth,
  setupInstitutionDb,
  approvePermission
);

// Reject permission request
router.put(
  '/institutions/:institutionId/permissions/:permissionId/reject',
  requireAuth,
  setupInstitutionDb,
  rejectPermission
);

// Delete permission request
router.delete(
  '/institutions/:institutionId/permissions/:permissionId',
  requireAuth,
  setupInstitutionDb,
  deletePermission
);

// Download permission template
router.get(
  '/institutions/:institutionId/permission-template',
  downloadPermissionTemplate
);

// Upload permission requests from Excel
router.post(
  '/institutions/:institutionId/upload-permissions',
  requireAuth,
  setupInstitutionDb,
  upload.single('file'),
  uploadPermissionExcel
);

// ===== COMPOFF MANAGEMENT ROUTES =====
// Create CompOff (Manual)
router.post(
  '/institutions/:institutionId/compoff/manual',
  requireAuth,
  setupInstitutionDb,
  createCompOffManual
);

// Create CompOff (Automatic)
router.post(
  '/institutions/:institutionId/compoff/automatic',
  requireAuth,
  setupInstitutionDb,
  createCompOffAutomatic
);

// Get all CompOff records
router.get(
  '/institutions/:institutionId/compoff',
  requireAuth,
  setupInstitutionDb,
  getCompOffRecords
);

// Get CompOff balance for user
router.get(
  '/institutions/:institutionId/users/:userId/compoff-balance',
  requireAuth,
  setupInstitutionDb,
  getUserCompOffBalance
);

// Mark CompOff as used
router.put(
  '/institutions/:institutionId/compoff/:compOffId/use',
  requireAuth,
  setupInstitutionDb,
  useCompOff
);

// Cancel CompOff
router.put(
  '/institutions/:institutionId/compoff/:compOffId/cancel',
  requireAuth,
  setupInstitutionDb,
  cancelCompOff
);

// Delete CompOff
router.delete(
  '/institutions/:institutionId/compoff/:compOffId',
  requireAuth,
  setupInstitutionDb,
  deleteCompOff
);

// Download CompOff template
router.get(
  '/institutions/:institutionId/compoff-template',
  downloadCompOffTemplate
);

// Upload CompOff records from Excel
router.post(
  '/institutions/:institutionId/upload-compoff',
  requireAuth,
  setupInstitutionDb,
  upload.single('file'),
  uploadCompOffExcel
);

// ===== COMPOFF REPORTS =====
// Get monthly CompOff report for user
router.get(
  '/institutions/:institutionId/users/:userId/compoff-report',
  requireAuth,
  setupInstitutionDb,
  getMonthlyCompOffReport
);

// Get CompOff summary for entire institution
router.get(
  '/institutions/:institutionId/compoff-summary',
  requireAuth,
  setupInstitutionDb,
  getInstitutionCompOffSummary
);



// Get CompOff history for user
router.get(
  '/institutions/:institutionId/users/:userId/compoff-history',
  requireAuth,
  setupInstitutionDb,
  getCompOffHistoryForUser
);

// ===== COMPOFF ASSIGNMENT =====
// Assign CompOff to faculties
router.post(
  '/institutions/:institutionId/compoff/assign-faculties',
  requireAuth,
  setupInstitutionDb,
  assignCompOffToFaculties
);

// Get faculty CompOff assignments
router.get(
  '/institutions/:institutionId/compoff/faculty-assignments',
  requireAuth,
  setupInstitutionDb,
  getFacultyCompOffAssignments
);

// Adjust CompOff assignment
router.patch(
  '/institutions/:institutionId/compoff/:compOffId/adjust',
  requireAuth,
  setupInstitutionDb,
  adjustCompOffAssignment
);

// ===== HOLIDAY MANAGEMENT ROUTES =====
// Create holiday
router.post(
  '/institutions/:institutionId/holidays',
  requireAuth,
  setupInstitutionDb,
  createHoliday
);

// Get all holidays for institution
router.get(
  '/institutions/:institutionId/holidays',
  requireAuth,
  setupInstitutionDb,
  getHolidays
);

// Get holiday by ID
router.get(
  '/institutions/:institutionId/holidays/:holidayId',
  requireAuth,
  setupInstitutionDb,
  getHolidayById
);

// Update holiday
router.put(
  '/institutions/:institutionId/holidays/:holidayId',
  requireAuth,
  setupInstitutionDb,
  updateHoliday
);

// Delete holiday
router.delete(
  '/institutions/:institutionId/holidays/:holidayId',
  requireAuth,
  setupInstitutionDb,
  deleteHoliday
);

// ===== HIKVISION HTTP LISTENER =====
import { listenToEvent, uploadHikvision } from './controllers/hikvisionController.js';

// ── The URL configured on the device ends in /hik  (e.g. /api/institutions/:id/hik)
// ── Also keep /hikvision/listen for backwards compatibility
// ── Accept both GET (device handshake/ping) and POST (actual event push)

// Device handshake – Hikvision sends a GET first to verify the server is alive
router.get(
  '/institutions/:institutionId/hik',
  (req, res) => {
    console.log(`[HIK] 🤝 GET handshake from device for institution ${req.params.institutionId} | IP: ${req.ip}`);
    res.status(200).send('OK');
  }
);

// Actual event POST – this is where face/card events arrive
router.post(
  '/institutions/:institutionId/hik',
  uploadHikvision.any(),   // parse multipart/form-data fields + files
  setupInstitutionDb,
  listenToEvent
);

// Legacy path (keep working)
router.get(
  '/institutions/:institutionId/hikvision/listen',
  (req, res) => {
    console.log(`[HIK] 🤝 GET handshake (legacy path) | IP: ${req.ip}`);
    res.status(200).send('OK');
  }
);
router.post(
  '/institutions/:institutionId/hikvision/listen',
  uploadHikvision.any(),
  setupInstitutionDb,
  listenToEvent
);

// ===== EMAIL MANAGEMENT =====
router.post(
  '/institutions/:institutionId/send-daily-reports',
  requireAuth,
  setupInstitutionDb,
  emailController.sendDailyReportsManual
);

router.post(
  '/institutions/:institutionId/send-custom-email',
  requireAuth,
  setupInstitutionDb,
  emailController.sendCustomEmail
);


export default router;
