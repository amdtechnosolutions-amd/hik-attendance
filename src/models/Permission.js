import mongoose from 'mongoose';
const { Schema } = mongoose;

const PermissionSchema = new Schema({
  institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvalDate: { type: Date },
  comments: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PermissionSchema.index({ institutionId: 1, userId: 1 });
PermissionSchema.index({ institutionId: 1, permissionDate: 1 });
PermissionSchema.index({ institutionId: 1, status: 1 });

export default mongoose.model('Permission', PermissionSchema);
