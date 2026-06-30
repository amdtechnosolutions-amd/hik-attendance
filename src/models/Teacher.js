import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // references your User collection
      required: true,
      unique: true, // one teacher per user
      ref: "User",
    },
    seniorityNo: {
      type: Number,
      required: true,
      unique: true, // ensures each number is unique
    },
  },
  { timestamps: true }
);

export default mongoose.model("Teacher", teacherSchema);
