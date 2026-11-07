import mongoose from "mongoose";

const datasetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    datasetType: {
      type: String,
      enum: ["satellite", "weather_station", "environmental_sensor", "historical", "mixed", "other"],
      required: true
    },
    fileFormat: {
      type: String,
      enum: ["CSV", "JSON", "XML", "NETCDF", "HDF5", "GEOTIFF", "PARQUET", "OTHER"],
      required: true
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    originalFilename: { type: String, maxlength: 200 },
    fileSize: { type: Number, min: 1 },
    processingStatus: {
      type: String,
      enum: ["queued", "processing", "completed", "processed", "failed", "needs_review"],
      default: "queued"
    },
    processingResults: { type: mongoose.Schema.Types.Mixed },
    processingError: { type: String, maxlength: 500 },
    recordCount: { type: Number, min: 0, default: 0 },
    storagePath: { type: String, maxlength: 1024 },
    uploadId: { type: mongoose.Schema.Types.ObjectId, ref: "ClimateUpload", unique: true, sparse: true }
  },
  { timestamps: true, collection: "datasets" }
);

datasetSchema.index({ uploadedBy: 1, createdAt: -1 });

export const Dataset = mongoose.model("Dataset", datasetSchema);

export function publicDataset(dataset) {
  const uploadedBy = dataset.uploadedBy;
  return {
    id: dataset._id.toString(),
    name: dataset.name,
    datasetType: dataset.datasetType,
    fileFormat: dataset.fileFormat,
    originalFilename: dataset.originalFilename,
    fileSize: dataset.fileSize,
    uploadDate: dataset.createdAt,
    uploadedBy: typeof uploadedBy === "object" && uploadedBy?.email
      ? { id: uploadedBy._id.toString(), email: uploadedBy.email }
      : uploadedBy?.toString(),
    processingStatus: dataset.processingStatus,
    processingResults: dataset.processingResults,
    processingError: dataset.processingError,
    recordCount: dataset.recordCount,
    storagePath: dataset.storagePath
  };
}
