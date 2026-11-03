import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["Product feedback", "Technical issue", "Data question", "Access request", "Other"],
      required: true
    },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["received", "in_progress", "resolved"], default: "received" },
    adminNote: { type: String, trim: true, maxlength: 1000, default: "" }
  },
  { timestamps: true, collection: "feedback" }
);

feedbackSchema.index({ submittedBy:  1, createdAt: -1 });

export const Feedback = mongoose.model("Feedback", feedbackSchema);

export function publicFeedback(feedback) {
  const submittedBy = feedback.submittedBy;
  return {
    id: feedback._id.toString(),
    category: feedback.category,
    subject: feedback.subject,
    message: feedback.message,
    status: feedback.status,
    adminNote: feedback.adminNote,
    submittedBy: typeof submittedBy === "object" && submittedBy?.email
      ? { id: submittedBy._id.toString(), email: submittedBy.email }
      : submittedBy?.toString(),
    createdAt: feedback.createdAt,
    updatedAt: feedback.updatedAt
  };
}
