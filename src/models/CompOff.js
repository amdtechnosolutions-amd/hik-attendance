import mongoose from 'mongoose';
const { Schema } = mongoose;

const CompOffSchema = new Schema({
  institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
  
  usedInAttendanceId: { type: Schema.Types.ObjectId, ref: 'Attendance' },
  
  notes: { type: String },
  
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

CompOffSchema.index({ institutionId: 1, userId: 1 });
CompOffSchema.index({ institutionId: 1, employeeNo: 1 });
CompOffSchema.index({ institutionId: 1, status: 1 });
CompOffSchema.index({ institutionId: 1, earnedDate: 1 });
CompOffSchema.index({ institutionId: 1, usedDate: 1 });

export default mongoose.model('CompOff', CompOffSchema);
