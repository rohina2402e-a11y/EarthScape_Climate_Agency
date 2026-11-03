import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requirePasswordUpdated, requireRole } from "../../middleware/auth.js";
import { Dataset, publicDataset } from "./dataset.model.js";

function isValidFormat(value) {
  return ["CSV", "JSON", "NETCDF", "GEOTIFF", "PARQUET", "OTHER"].includes(value);
}

function isValidDatasetType(value) {
  return ["satellite", "weather_station", "environmental_sensor", "mixed", "other"].includes(value);
}

export default function datasetRoutes({ jwtSecret }) {
  const router = Router();
  router.use(requireAuth({ jwtSecret }), requirePasswordUpdated);

  router.get("/", async (_request, response, next) => {
    try {
      const datasets = await Dataset.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("uploadedBy", "email")
        .lean();
      return response.json({ datasets: datasets.map(publicDataset) });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Dataset ID is invalid." });
    }

    try {
      const dataset = await Dataset.findById(request.params.id).populate("uploadedBy", "email").lean();
      if (!dataset) return response.status(404).json({ error: "Dataset was not found." });
      return response.json({ dataset: publicDataset(dataset) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/upload", requireRole("admin"), async (request, response, next) => {
    const { name, datasetType, fileFormat } = request.body ?? {};
    const body = request.body ?? {};
    if (Object.keys(body).some((key) => !["name", "datasetType", "fileFormat"].includes(key))) {
      return response.status(400).json({ error: "Only name, datasetType, and fileFormat may be supplied." });
    }
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 200 ||
      !isValidDatasetType(datasetType) ||
      !isValidFormat(fileFormat)
    ) {
      return response.status(400).json({
        error: "Provide a dataset name (up to 200 characters), a valid datasetType, and a supported fileFormat."
      });
    }

    try {
      const dataset = await Dataset.create({
        name: name.trim(),
        datasetType,
        fileFormat,
        uploadedBy: request.user._id,
        processingStatus: "queued"
      });
      return response.status(201).json({ dataset: publicDataset(dataset) });
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
        return response.status(400).json({ error: error.message });
      }
      return next(error);
    }
  });

  router.delete("/:id", requireRole("admin"), async (request, response, next) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Dataset ID is invalid." });
    }

    try {
      const dataset = await Dataset.findByIdAndDelete(request.params.id);
      if (!dataset) return response.status(404).json({ error: "Dataset was not found." });
      return response.json({ message: "Dataset metadata deleted." });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
