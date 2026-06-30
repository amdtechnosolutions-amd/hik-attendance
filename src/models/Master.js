import mongoose from 'mongoose';
const { Schema } = mongoose;

const MasterSchema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: String,
  role: { type: String, default: 'master' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Master', MasterSchema);
