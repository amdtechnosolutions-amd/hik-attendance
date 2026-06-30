import mongoose from 'mongoose';
const { Schema } = mongoose;

const AttendanceSchema = new Schema({
  institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  deviceId: { type: Schema.Types.ObjectId, ref: 'Device' },
  employeeNo: String,
  eventType: String,
  timestamp: Date,
  raw: Schema.Types.Mixed,
  usedCompOff: { type: Boolean, default: false },
  compOffId: { type: Schema.Types.ObjectId, ref: 'CompOff' },
  compOffNote: { type: String },
  createdAt: { type: Date, default: Date.now }
});

AttendanceSchema.index({ institutionId: 1, timestamp: -1 });
AttendanceSchema.index({ institutionId: 1, employeeNo: 1, timestamp: -1 });
AttendanceSchema.index({ institutionId: 1, usedCompOff: 1 });

export default mongoose.model('Attendance', AttendanceSchema);