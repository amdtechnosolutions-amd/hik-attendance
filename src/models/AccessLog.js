import mongoose from 'mongoose';

const AccessLogSchema = new mongoose.Schema({
  institutionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institution', required: true },
  employeeNo:    { type: String },
  type:          { type: String, enum: ['FACE', 'CARD', 'PIN_SUCCESS', 'PIN_FAIL', 'UNKNOWN', 'HEARTBEAT'], default: 'UNKNOWN' },
  eventTime:     { type: Date, required: true },
  serialNo:      { type: Number },          // Hikvision serialNo for deduplication
  ipAddress:     { type: String },
  details:       { type: Object, default: {} },
}, { timestamps: true });

AccessLogSchema.index({ institutionId: 1, eventTime: -1 });
AccessLogSchema.index({ serialNo: 1 }, { sparse: true });   // fast dedup lookup
AccessLogSchema.index({ institutionId: 1, employeeNo: 1, eventTime: -1 });

export default mongoose.model('AccessLog', AccessLogSchema);
