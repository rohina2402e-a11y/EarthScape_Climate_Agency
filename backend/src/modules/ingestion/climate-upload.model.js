import mongoose from "mongoose";

const climateUploadSchema = new mongoose.Schema(
  {
    originalFilename: { type: String, required: true, maxlength: 200 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sha256: { type: String, required: true, minlength: 64, maxlength: 64 },
    fileSize: { type: Number, required: true, min: 1 },
    storagePath: { type: String, maxlength: 1024 },
    recordCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["processing", "completed", "failed"], required: true },
    errorMessage: { type: String, maxlength: 500 }
  },
  { timestamps: true }
);

climateUploadSchema.index({ uploadedBy: 1, createdAt: -1 });

export const ClimateUpload = mongoose.model("ClimateUpload", climateUploadSchema);
