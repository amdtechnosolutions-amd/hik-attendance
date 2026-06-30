import mongoose from 'mongoose';
const { Schema } = mongoose;

const RoleSchema = new Schema({
  name: { type: String, required: true },
  permissions: [String]
});

export default mongoose.model('Role', RoleSchema);