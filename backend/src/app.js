import cors from "cors";
import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import authRoutes from "./modules/auth/auth.routes.js";
import alertRoutes from "./modules/alerts/alert.routes.js";
import datasetRoutes from "./modules/datasets/dataset.routes.js";
import feedbackRoutes from "./modules/feedback/feedback.routes.js";
import ingestionRoutes from "./modules/ingestion/ingestion.routes.js";
import observationRoutes from "./modules/observations/observation.routes.js";
import userRoutes from "./modules/users/user.routes.js";

export function createApp({ frontendOrigin, jwtSecret, climateStorage, datasetStorage }) {
  const app = express();

  app.use(cors({ origin: frontendOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_request, response) => {
    const connected = mongoose.connection.readyState === 1;
    response.status(connected ? 200 : 503).json({
      status: connected ? "ok" : "unavailable",
      database: connected ? "connected" : "disconnected"
    });
  });

  app.use("/api/auth", authRoutes({ jwtSecret }));
  app.use("/api/datasets", datasetRoutes({ jwtSecret, datasetStorage }));
  app.use("/api/alerts", alertRoutes({ jwtSecret }));
  app.use("/api/feedback", feedbackRoutes({ jwtSecret }));
  app.use("/api/users", userRoutes({ jwtSecret }));
  app.use("/api/observations", observationRoutes({ jwtSecret }));
  app.use("/api/ingestion", ingestionRoutes({ jwtSecret, climateStorage }));

  app.use((error, request, response, _next) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      const datasetUpload = request.originalUrl.startsWith("/api/datasets/upload");
      const message = error.code === "LIMIT_FILE_SIZE"
        ? datasetUpload
          ? "Dataset file exceeds the 100 MB upload limit."
          : "CSV file exceeds the 5 MB upload limit."
        : datasetUpload
          ? "Upload must contain exactly one file and only the supported dataset fields."
          : "Upload must contain exactly one CSV file and no additional fields.";
      return response.status(status).json({ error: message });
    }

    if (error instanceof SyntaxError && "body" in error) {
      return response.status(400).json({ error: "Request body must be valid JSON." });
    }

    if (error.type === "entity.too.large") {
      return response.status(413).json({ error: "Request body exceeds the 1 MB limit." });
    }

    console.error(error);
    return response.status(500).json({ error: "An unexpected server error occurred." });
  });

  return app;
}
