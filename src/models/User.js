
import mongoose from 'mongoose';
const { Schema } = mongoose;

const UserSchema = new Schema({
  institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  employeeNo: { type: String, required: true },
  name: String,                        // Single name field without splitting
  userType: { type: String, default: 'normal' },
  cardNo: String,
  faceData: Schema.Types.Mixed,
  fingerprintData: Schema.Types.Mixed,
  seniorityNo: { type: Number, unique: true, sparse: true }, // Add seniority
  faceImageUrl: String,                // URL to the face image stored locally
  faceImageHikUrl: String,             // Original Hikvision face image URL
  fpid: String,                        // Hikvision Face Person ID
  createdAt: { type: Date, default: Date.now }
});

// Composite unique index for uniqueness within institution
UserSchema.index({ institutionId: 1, employeeNo: 1 }, { unique: true });

export default mongoose.model('User', UserSchema);

