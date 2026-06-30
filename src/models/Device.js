import mongoose from 'mongoose';
const { Schema } = mongoose;

const DeviceSchema = new Schema({
  institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
  name: String,
  ip: String,
  port: Number,
  username: String,
  password: String,
  model: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Device', DeviceSchema);