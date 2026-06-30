import mongoose from 'mongoose';
const { Schema } = mongoose;

const InstitutionSchema = new Schema({
  name: { type: String, required: true },
  shortName: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String },
  dbCreated: { type: Boolean, default: false }, // Flag to track if institution-specific database has been created
  dbName: { type: String }, // Store the database name for this institution
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Institution', InstitutionSchema);