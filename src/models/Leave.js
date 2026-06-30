import mongoose from 'mongoose';
const { Schema } = mongoose;

const LeaveSchema = new Schema({
  institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  employeeNo: { type: String, required: true },
  leaveDate: { type: Date, required: true },
  type: {
    type: String,
    enum: ['half-day-morning', 'half-day-afternoon', 'full-day', 'maternity'],
    default: 'half-day-morning'
  },
  reason: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvalDate: { type: Date },
  comments: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

LeaveSchema.index({ institutionId: 1, userId: 1 });
LeaveSchema.index({ institutionId: 1, leaveDate: 1 });
LeaveSchema.index({ institutionId: 1, status: 1 });

export default mongoose.model('Leave', LeaveSchema);
