import mongoose from 'mongoose';
const { Schema } = mongoose;

const OnDutySchema = new Schema({
  institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

// Indexes for faster queries
OnDutySchema.index({ institutionId: 1, userId: 1 });
OnDutySchema.index({ institutionId: 1, startDate: 1, endDate: 1 });
OnDutySchema.index({ institutionId: 1, employeeNo: 1 });

export default mongoose.model('OnDuty', OnDutySchema);