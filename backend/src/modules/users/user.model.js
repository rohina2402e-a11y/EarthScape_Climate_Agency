import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "analyst"], required: true },
    active: { type: Boolean, default: true },
    passwordChangeRequired: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);

export function publicUser(user) {
  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    passwordChangeRequired: user.passwordChangeRequired,
    createdAt: user.createdAt
  };
}
