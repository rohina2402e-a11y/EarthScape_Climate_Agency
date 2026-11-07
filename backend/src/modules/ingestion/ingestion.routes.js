import { createHash } from "node:crypto";
import path from "node:path";
import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";
import { requireAuth, requirePasswordUpdated, requireRole } from "../../middleware/auth.js";
import { Observation } from "../observations/observation.model.js";
import { Dataset } from "../datasets/dataset.model.js";
import { ClimateCsvError, parseClimateCsv } from "./climate-csv.js";
import { ClimateUpload } from "./climate-upload.model.js";
import { LocalClimateStorageError } from "../../services/local-climate-storage.service.js";

const MAX_FILE_SIZE = process.env.VERCEL ? 4 * 1024 * 1024 : 5 * 1024 * 1024;
const uploadFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 0, parts: 1 },
  fileFilter: (_request, file, callback) => {
    callback(null, path.extname(file.originalname).toLowerCase() === ".csv");
  }
});

function displayFilename(originalname) {
  return (originalname.split(/[\\/]/).pop() || "climate-data.csv")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 200);
}

export default function ingestionRoutes({ jwtSecret, climateStorage }) {
  const router = Router();
  router.use(requireAuth({ jwtSecret }), requirePasswordUpdated);

  router.get("/uploads", async (request, response, next) => {
    try {
      const filter = request.user.role === "admin" ? {} : { uploadedBy: request.user._id };
      const uploads = await ClimateUpload.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("uploadedBy", "email")
        .lean();
      return response.json({ uploads });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/uploads", requireRole("admin"), uploadFile.single("file"), async (request, response, next) => {
    if (!request.file) {
      return response.status(400).json({ error: "Choose a .csv file to upload." });
    }
    if (!climateStorage) {
      return response.status(503).json({
        error: "Local climate file storage is not configured."
      });
    }

    const filename = displayFilename(request.file.originalname);
    const sha256 = createHash("sha256").update(request.file.buffer).digest("hex");
    let upload;

    try {
      const duplicate = await ClimateUpload.exists({
        uploadedBy: request.user._id,
        sha256,
        status: "completed"
      });
      if (duplicate) {
        return response.status(409).json({
          error: "You have already imported this exact file. Choose a different file if you meant to upload new data."
        });
      }

      upload = await ClimateUpload.create({
        originalFilename: filename,
        uploadedBy: request.user._id,
        sha256,
        fileSize: request.file.size,
        status: "processing"
      });

      let observations;
      try {
        observations = parseClimateCsv(request.file.buffer);
        for (const [index, data] of observations.entries()) {
          const validationError = new Observation(data).validateSync();
          if (validationError) {
            throw new ClimateCsvError(`CSV row ${index + 2}: ${validationError.message}`);
          }
        }
      } catch (error) {
        if (!(error instanceof ClimateCsvError)) throw error;

        upload.status = "failed";
        upload.errorMessage = error.message.slice(0, 500);
        await upload.save();
        return response.status(400).json({
          error: error.message,
          upload: upload.toObject()
        });
      }

      const storagePath = path.posix.join(
        "uploads",
        request.user._id.toString(),
        `${upload._id}-${sha256}.csv`
      );
      upload.storagePath = storagePath;
      await upload.save();
      await climateStorage.writeFile(storagePath, request.file.buffer);

      await Observation.insertMany(
        observations.map((observation) => ({ ...observation, uploadId: upload._id })),
        { ordered: true }
      );

      upload.status = "completed";
      upload.recordCount = observations.length;
      await upload.save();

      const sourceTypes = [...new Set(observations.map((observation) => observation.sourceType))];
      const dataset = await Dataset.create({
        name: filename,
        datasetType: sourceTypes.length === 1 ? sourceTypes[0] : "mixed",
        fileFormat: "CSV",
        uploadedBy: request.user._id,
        processingStatus: "processed",
        recordCount: observations.length,
        storagePath,
        uploadId: upload._id
      });

      return response.status(201).json({ upload: upload.toObject(), dataset });
    } catch (error) {
      if (upload?._id) {
        try {
          await Observation.deleteMany({ uploadId: upload._id });
        } catch (cleanupError) {
          console.error("Could not remove observations from an incomplete climate data import.", {
            uploadId: upload._id.toString(),
            cleanupError
          });
        }

        if (upload.storagePath) {
          try {
            await climateStorage.deleteFile(upload.storagePath);
            upload.storagePath = undefined;
          } catch (cleanupError) {
            console.error("Could not remove the local file from an incomplete climate data import.", {
              uploadId: upload._id.toString(),
              storagePath: upload.storagePath,
              cleanupError
            });
          }
        }

        upload.status = "failed";
        upload.errorMessage = "The import could not be saved. No observations were retained.";
        try {
          await upload.save();
        } catch (saveError) {
          console.error("Could not update the status of an incomplete climate data import.", {
            uploadId: upload._id.toString(),
            saveError
          });
        }
      }

      if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
        return response.status(400).json({ error: error.message });
      }
      if (error instanceof LocalClimateStorageError) {
        if (upload) {
          upload.status = "failed";
          upload.errorMessage = error.message.slice(0, 500);
          await upload.save();
        }
        return response.status(error.statusCode).json({
          error: "Could not store the original CSV in local climate storage.",
          details: error.message,
          upload: upload?.toObject()
        });
      }
      return next(error);
    }
  });

  return router;
}
