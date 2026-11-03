import mongoose from "mongoose";

const measurementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    value: {
      type: Number,
      required: true,
      validate: { validator: Number.isFinite, message: "Measurement value must be finite." }
    },
    unit: { type: String, required: true, trim: true, maxlength: 32 }
  },
  { _id: false }
);

const observationSchema = new mongoose.Schema(
  {
    uploadId: { type: mongoose.Schema.Types.ObjectId, ref: "ClimateUpload" },
    sourceType: {
      type: String,
      enum: ["satellite", "weather_station", "environmental_sensor"],
      required: true
    },
    sourceId: { type: String, required: true, trim: true, maxlength: 100 },
    observedAt: { type: Date, required: true },
    location: {
      latitude: { type: Number, required: true, min: -90, max: 90 },
      longitude: { type: Number, required: true, min: -180, max: 180 }
    },
    measurements: {
      type: [measurementSchema],
      required: true,
      validate: {
        validator: (measurements) => measurements.length > 0,
        message: "At least one measurement is required."
      }
    },
    quality: { type: String, enum: ["valid", "needs_review"], default: "valid" }
  },
  { timestamps: true }
);

export const Observation = mongoose.model("Observation", observationSchema);
