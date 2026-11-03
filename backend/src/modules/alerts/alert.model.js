import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true, collection: "alerts" }
);

alertSchema.index({ createdAt: -1 });

export const Alert = mongoose.model("Alert", alertSchema);

export function publicAlert(alert, userId) {
  return {
    id: alert._id.toString(),
    title: alert.title,
    description: alert.description,
    location: alert.location,
    category: alert.category,
    severity: alert.severity,
    read: alert.readBy.some((id) => id.toString() === userId.toString()),
    createdAt: alert.createdAt
  };
}
