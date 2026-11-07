import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Router } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { requireAuth, requirePasswordUpdated, requireRole } from "../../middleware/auth.js";
import { Dataset, publicDataset } from "./dataset.model.js";
import { LocalClimateStorageError } from "../../services/local-climate-storage.service.js";

const MAX_FILE_SIZE = process.env.VERCEL ? 4 * 1024 * 1024 : 100 * 1024 * 1024;
const FORMAT_BY_EXTENSION = new Map([
  [".csv", "CSV"],
  [".json", "JSON"],
  [".xml", "XML"],
  [".nc", "NETCDF"],
  [".nc4", "NETCDF"],
  [".netcdf", "NETCDF"],
  [".h5", "HDF5"],
  [".hdf5", "HDF5"],
  [".tif", "GEOTIFF"],
  [".tiff", "GEOTIFF"]
]);
const CATEGORY_BY_TYPE = {
  satellite: "satellite",
  weather_station: "weather",
  environmental_sensor: "sensors",
  historical: "historical",
  mixed: "historical",
  other: "historical"
};
const UPLOAD_TYPES = new Set([
  "satellite",
  "weather_station",
  "environmental_sensor",
  "historical"
]);

function displayFilename(originalname) {
  return (originalname.split(/[\\/]/).pop() || "climate-dataset")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 200);
}

function createDatasetUpload(datasetStorage) {
  const diskStorage = multer.diskStorage({
    destination: (_request, _file, callback) => {
      mkdir(datasetStorage.stagingDirectory, { recursive: true })
        .then(() => callback(null, datasetStorage.stagingDirectory), callback);
    },
    filename: (_request, _file, callback) => callback(null, randomUUID())
  });
  return multer({
    storage: diskStorage,
    limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 2, parts: 3 },
    fileFilter: (_request, file, callback) => {
      callback(null, FORMAT_BY_EXTENSION.has(path.extname(file.originalname).toLowerCase()));
    }
  }).single("file");
}

export default function datasetRoutes({ jwtSecret, datasetStorage, climateProcessor }) {
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

  router.post("/upload", requireRole("admin"), (request, response, next) => {
    if (!datasetStorage) {
      return response.status(503).json({ error: "Dataset file storage is not configured." });
    }
    return createDatasetUpload(datasetStorage)(request, response, next);
  }, async (request, response, next) => {
    const body = request.body ?? {};
    const originalFilename = request.file ? displayFilename(request.file.originalname) : undefined;
    const name = typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : originalFilename?.replace(/\.[^.]+$/, "");
    const datasetType = body.datasetType;
    const extension = request.file && path.extname(request.file.originalname).toLowerCase();
    const fileFormat = FORMAT_BY_EXTENSION.get(extension);

    if (!request.file || !fileFormat) {
      if (request.file) {
        try {
          await datasetStorage.deleteStagedFile(request.file.filename);
        } catch (error) {
          return next(error);
        }
      }
      return response.status(400).json({
        error: "Choose one supported file: CSV, JSON, XML, NetCDF, HDF5, or GeoTIFF."
      });
    }
    if (
      Object.keys(body).some((key) => !["name", "datasetType"].includes(key)) ||
      typeof name !== "string" ||
      !name ||
      name.length > 200 ||
      !UPLOAD_TYPES.has(datasetType)
    ) {
      try {
        await datasetStorage.deleteStagedFile(request.file.filename);
      } catch (error) {
        return next(error);
      }
      return response.status(400).json({
        error: "Provide a dataset name up to 200 characters and a valid datasetType."
      });
    }

    const storagePath = path.posix.join(
      CATEGORY_BY_TYPE[datasetType],
      `${randomUUID()}${extension}`
    );
    let fileMoved = false;
    let dataset;
    try {
      await datasetStorage.moveFile(request.file.path, storagePath);
      fileMoved = true;
      dataset = await Dataset.create({
        name,
        datasetType,
        fileFormat,
        originalFilename,
        fileSize: request.file.size,
        uploadedBy: request.user._id,
        processingStatus: "queued",
        storagePath
      });

      if (climateProcessor && ["CSV", "JSON"].includes(fileFormat)) {
        dataset.processingStatus = "processing";
        await dataset.save();
        try {
          const content = await datasetStorage.readFile(storagePath);
          const processingResults = await climateProcessor({ content, fileFormat });
          dataset.processingResults = processingResults;
          dataset.recordCount = processingResults.record_count;
          dataset.processingStatus = "completed";
          dataset.processingError = undefined;
        } catch (processingError) {
          console.error("Climate dataset processing failed.", {
            datasetId: dataset._id.toString(),
            processingError
          });
          dataset.processingStatus = "failed";
          dataset.processingError = (
            processingError instanceof Error ? processingError.message : String(processingError)
          ).slice(0, 500);
        }
        await dataset.save();
      }

      return response.status(201).json({ dataset: publicDataset(dataset) });
    } catch (error) {
      if (!dataset) {
        try {
          if (fileMoved) await datasetStorage.deleteFile(storagePath);
          else await datasetStorage.deleteStagedFile(request.file.filename);
        } catch (cleanupError) {
          console.error("Could not clean up an incomplete dataset upload.", {
            storagePath,
            cleanupError
          });
        }
      }

      if (error instanceof LocalClimateStorageError) {
        return response.status(error.statusCode).json({
          error: "Could not store the uploaded dataset in local storage.",
          details: error.message
        });
      }
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
      const dataset = await Dataset.findById(request.params.id);
      if (!dataset) return response.status(404).json({ error: "Dataset was not found." });
      if (dataset.storagePath && datasetStorage && !dataset.uploadId) {
        await datasetStorage.deleteFile(dataset.storagePath);
      }
      await dataset.deleteOne();
      return response.json({
        message: dataset.uploadId
          ? "Dataset metadata was deleted; its imported observations and source file were retained."
          : "Dataset and its stored file were deleted."
      });
    } catch (error) {
      if (error instanceof LocalClimateStorageError) {
        return response.status(error.statusCode).json({
          error: "Could not delete the dataset file from local storage.",
          details: error.message
        });
      }
      return next(error);
    }
  });

  return router;
}
