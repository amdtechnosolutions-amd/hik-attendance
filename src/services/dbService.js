import mongoose from 'mongoose';
import '../models/Institution.js'; // Import Institution model

// Store connections to institution-specific databases
const connections = new Map();

// Maximum number of concurrent connections to maintain
const MAX_CONNECTIONS = 10;

// Last accessed time for each connection (for LRU eviction)
const connectionLastAccessed = new Map();

// Connect to the master database
export async function connectMaster() {
  try {
    const masterConnection = await mongoose.connect(process.env.MONGO_URI, {});
    console.log('Master database connected');
    return masterConnection;
  } catch (error) {
    console.error('Error connecting to master database:', error);
    throw error;
  }
}

// Get or create a connection to an institution-specific database
export async function getInstitutionConnection(institutionId) {
  // If connection already exists, update last accessed time and return it
  if (connections.has(institutionId)) {
    connectionLastAccessed.set(institutionId, Date.now());
    return connections.get(institutionId);
  }

  // If we've reached the maximum number of connections, close the least recently used one
  if (connections.size >= MAX_CONNECTIONS) {
    let oldestId = null;
    let oldestTime = Infinity;

    // Find the least recently used connection
    for (const [id, time] of connectionLastAccessed.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestId = id;
      }
    }

    // Close and remove the oldest connection
    if (oldestId) {
      await closeConnection(oldestId);
    }
  }

  try {
    // Get the institution from the master database to access shortName
    const Institution = mongoose.model('Institution');
    const institution = await Institution.findById(institutionId);

    if (!institution) {
      throw new Error(`Institution with ID ${institutionId} not found`);
    }

    // Create a new connection for this institution using shortName
    const dbName = institution.dbName || `ves_${institution.shortName.toLowerCase()}`;

    // Split URI into base and query parts to preserve authSource and other params
    const uriParts = process.env.MONGO_URI.split('?');
    const baseUrl = uriParts[0];
    const queryParams = uriParts.length > 1 ? `?${uriParts[1]}` : '';

    // Replace database name in the base URL
    const newBaseUrl = baseUrl.replace(/\/[^/]*$/, `/${dbName}`);
    const mongoUri = `${newBaseUrl}${queryParams}`;

    const connection = await mongoose.createConnection(mongoUri).asPromise();
    console.log(`Connected to institution database: ${dbName}`);

    // Store the connection and update last accessed time
    connections.set(institutionId, connection);
    connectionLastAccessed.set(institutionId, Date.now());

    return connection;
  } catch (error) {
    console.error(`Error connecting to institution database for ${institutionId}:`, error);
    throw error;
  }
}

// Close a specific institution connection
export async function closeConnection(institutionId) {
  try {
    if (connections.has(institutionId)) {
      const connection = connections.get(institutionId);
      await connection.close();
      connections.delete(institutionId);
      connectionLastAccessed.delete(institutionId);
      console.log(`Closed database connection for institution ${institutionId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error closing database connection for institution ${institutionId}:`, error);
    throw error;
  }
}

// Close all connections
export async function closeAllConnections() {
  try {
    // Close the default connection
    await mongoose.connection.close();

    // Close all institution-specific connections
    for (const [institutionId, connection] of connections.entries()) {
      await connection.close();
      connections.delete(institutionId);
    }

    // Clear the connectionLastAccessed map
    connectionLastAccessed.clear();

    console.log('All database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
    throw error;
  }
}

// Create models for an institution-specific database
export function createInstitutionModels(connection) {
  const models = {};

  // Check if models already exist for this connection to avoid OverwriteModelError
  try {
    // Try to get existing models first
    models.User = connection.model('User');
    models.Attendance = connection.model('Attendance');
    models.Device = connection.model('Device');

    // Try to get Teacher model if it exists
    try {
      models.Teacher = connection.model('Teacher');
    } catch (teacherError) {
      // Teacher model doesn't exist yet, will be created below
      console.log('Teacher model not found, will create it');
    }

    // Try to get OnDuty model if it exists
    try {
      models.OnDuty = connection.model('OnDuty');
    } catch (onDutyError) {
      // OnDuty model doesn't exist yet, will be created below
      console.log('OnDuty model not found, will create it');
    }

    // Try to get Leave model if it exists
    try {
      models.Leave = connection.model('Leave');
    } catch (leaveError) {
      console.log('Leave model not found, will create it');
    }

    // Try to get Permission model if it exists
    try {
      models.Permission = connection.model('Permission');
    } catch (permissionError) {
      console.log('Permission model not found, will create it');
    }

    // Try to get CompOff model if it exists
    try {
      models.CompOff = connection.model('CompOff');
    } catch (compOffError) {
      console.log('CompOff model not found, will create it');
    }

    // Try to get SyncJob model if it exists
    try {
      models.SyncJob = connection.model('SyncJob');
    } catch (syncJobError) {
      console.log('SyncJob model not found, will create it');
    }

    // Try to get Holiday model if it exists
    try {
      models.Holiday = connection.model('Holiday');
    } catch (holidayError) {
      console.log('Holiday model not found, will create it');
    }

    return models;
  } catch (error) {
    // If models don't exist, create them
    // Define schemas and create models using the institution-specific connection
    const userSchema = new mongoose.Schema({
      institutionId: { type: mongoose.Schema.Types.ObjectId, required: true },
      employeeNo: { type: String, required: true },
      name: { type: String, required: true },
      userType: { type: String, default: 'normal' },
      seniorityNo: { type: Number, sparse: true }, // Added seniorityNo field
      leaveDays: [{ type: String }], // Added leaveDays field for tracking leave
      cardNo: String,
      faceData: mongoose.Schema.Types.Mixed,
      fingerprintData: mongoose.Schema.Types.Mixed,
      faceImageUrl: String,                // URL to the face image stored locally
      faceImageHikUrl: String,             // Original Hikvision face image URL
      fpid: String,                        // Hikvision Face Person ID
      createdAt: { type: Date, default: Date.now }
    });

    userSchema.index({ institutionId: 1, employeeNo: 1 }, { unique: true });
    userSchema.index({ institutionId: 1, seniorityNo: 1 });

    const attendanceSchema = new mongoose.Schema({
      institutionId: { type: mongoose.Schema.Types.ObjectId, required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      employeeNo: { type: String, required: true },
      timestamp: { type: Date, required: true },
      deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
      eventType: { type: String },
      raw: { type: mongoose.Schema.Types.Mixed },
      date: { type: Date },
      usedCompOff: { type: Boolean, default: false },
      compOffId: { type: mongoose.Schema.Types.ObjectId, ref: 'CompOff' },
      compOffNote: { type: String },
      createdAt: { type: Date, default: Date.now }
    });

    attendanceSchema.index({ institutionId: 1, employeeNo: 1, timestamp: 1 });
    attendanceSchema.index({ institutionId: 1, timestamp: 1 });

    const deviceSchema = new mongoose.Schema({
      institutionId: { type: mongoose.Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      ipAddress: { type: String, required: true },
      port: { type: Number, default: 80 },
      username: { type: String, required: true },
      password: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }
    });

    // Define Teacher schema
    const teacherSchema = new mongoose.Schema({
      institutionId: { type: mongoose.Schema.Types.ObjectId, required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      seniorityNo: { type: Number, unique: true },
      createdAt: { type: Date, default: Date.now }
    });

    // Define OnDuty schema
    const onDutySchema = new mongoose.Schema({
      institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      employeeNo: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      description: { type: String, required: true },
      type: {
        type: String,
        enum: ['full-day', 'half-day-morning', 'half-day-afternoon'],
        default: 'full-day'
      },
      session: {
        type: String,
        enum: ['morning', 'afternoon', 'full'],
        default: 'full'
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    // Add indexes for faster queries
    onDutySchema.index({ institutionId: 1, userId: 1 });
    onDutySchema.index({ institutionId: 1, startDate: 1, endDate: 1 });
    onDutySchema.index({ institutionId: 1, employeeNo: 1 });

    // Define Leave schema
    const leaveSchema = new mongoose.Schema({
      institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      employeeNo: { type: String, required: true },
      leaveDate: { type: Date, required: true },
      type: {
        type: String,
        enum: ['half-day-morning', 'half-day-afternoon'],
        default: 'half-day-morning'
      },
      reason: { type: String, required: true },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvalDate: { type: Date },
      comments: { type: String },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    leaveSchema.index({ institutionId: 1, userId: 1 });
    leaveSchema.index({ institutionId: 1, leaveDate: 1 });
    leaveSchema.index({ institutionId: 1, status: 1 });

    // Define Permission schema
    const permissionSchema = new mongoose.Schema({
      institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      employeeNo: { type: String, required: true },
      permissionDate: { type: Date, required: true },
      type: {
        type: String,
        enum: ['1-hour-morning', '1-hour-afternoon'],
        default: '1-hour-morning'
      },
      reason: { type: String, required: true },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      approvalDate: { type: Date },
      comments: { type: String },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    permissionSchema.index({ institutionId: 1, userId: 1 });
    permissionSchema.index({ institutionId: 1, permissionDate: 1 });
    permissionSchema.index({ institutionId: 1, status: 1 });

    // Define CompOff schema
    const compOffSchema = new mongoose.Schema({
      institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      employeeNo: { type: String, required: true },
      earnedDate: { type: Date, required: true },
      holidayDate: { type: Date },
      earningType: {
        type: String,
        enum: ['automatic', 'manual'],
        default: 'automatic'
      },
      reason: { type: String },
      status: {
        type: String,
        enum: ['available', 'used', 'cancelled'],
        default: 'available'
      },
      usedDate: { type: Date },
      usedInAttendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
      notes: { type: String },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    compOffSchema.index({ institutionId: 1, userId: 1 });
    compOffSchema.index({ institutionId: 1, employeeNo: 1 });
    compOffSchema.index({ institutionId: 1, status: 1 });
    compOffSchema.index({ institutionId: 1, earnedDate: 1 });
    compOffSchema.index({ institutionId: 1, usedDate: 1 });

    // Define Holiday schema
    const holidaySchema = new mongoose.Schema({
      institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
      name: { type: String, required: true },
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      type: {
        type: String,
        enum: ['institution-holiday', 'emergency-holiday', 'special-day'],
        default: 'institution-holiday'
      },
      description: { type: String },
      isActive: { type: Boolean, default: true },
      showInAttendance: { type: Boolean, default: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    holidaySchema.index({ institutionId: 1, isActive: 1 });
    holidaySchema.index({ institutionId: 1, startDate: 1, endDate: 1 });
    holidaySchema.index({ institutionId: 1, type: 1 });

    // Define SyncJob schema for tracking background sync jobs
    const syncJobSchema = new mongoose.Schema({
      institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
      deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      fullSync: { type: Boolean, default: false },
      recordedCount: { type: Number, default: 0 },
      error: { type: String },
      progress: {
        currentPosition: { type: Number, default: 0 },
        totalEvents: { type: Number, default: 0 }
      },
      createdAt: { type: Date, default: Date.now },
      startedAt: { type: Date },
      completedAt: { type: Date }
    });

    syncJobSchema.index({ institutionId: 1, status: 1 });
    syncJobSchema.index({ institutionId: 1, deviceId: 1, createdAt: -1 });
    syncJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

    // Create and return the models
    return {
      User: connection.model('User', userSchema),
      Attendance: connection.model('Attendance', attendanceSchema),
      Device: connection.model('Device', deviceSchema),
      Teacher: connection.model('Teacher', teacherSchema),
      OnDuty: connection.model('OnDuty', onDutySchema),
      Leave: connection.model('Leave', leaveSchema),
      Permission: connection.model('Permission', permissionSchema),
      CompOff: connection.model('CompOff', compOffSchema),
      SyncJob: connection.model('SyncJob', syncJobSchema),
      Holiday: connection.model('Holiday', holidaySchema)
    };
  }
}