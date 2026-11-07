import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { connectToDatabase } from "./config/database.js";
import { createClimateProcessor } from "./services/climate-processing.service.js";
import { createLocalClimateStorage } from "./services/local-climate-storage.service.js";

const port = Number(process.env.PORT ?? 5000);
const mongoUri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/earthscape_climate";
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const jwtSecret = process.env.JWT_SECRET;
const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const climateStorageDirectory = process.env.CLIMATE_STORAGE_DIR
  ? path.resolve(backendDirectory, process.env.CLIMATE_STORAGE_DIR)
  : path.resolve(backendDirectory, "..", "data", "climate-data");
const datasetStorageDirectory = process.env.DATASET_STORAGE_DIR
  ? path.resolve(backendDirectory, process.env.DATASET_STORAGE_DIR)
  : path.resolve(backendDirectory, "uploads");
const defaultPythonExecutable = process.platform === "win32"
  ? path.resolve(backendDirectory, "..", ".venv", "Scripts", "python.exe")
  : path.resolve(backendDirectory, "..", ".venv", "bin", "python");
const climateProcessor = createClimateProcessor({
  pythonExecutable: process.env.PYTHON_EXECUTABLE ?? defaultPythonExecutable,
  dataDirectory: datasetStorageDirectory
});

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid port number.");
}

if (!jwtSecret || Buffer.byteLength(jwtSecret, "utf8") < 32) {
  throw new Error("JWT_SECRET must be set to a random value of at least 32 bytes.");
}

try {
  await connectToDatabase(mongoUri);
} catch (error) {
  console.error("Could not connect to MongoDB. Check that the server is running and MONGO_URI is correct.", error);
  process.exit(1);
}

const climateStorage = createLocalClimateStorage({ rootDirectory: climateStorageDirectory });
const datasetStorage = createLocalClimateStorage({ rootDirectory: datasetStorageDirectory });
const app = createApp({
  frontendOrigin,
  jwtSecret,
  climateStorage,
  datasetStorage,
  climateProcessor
});
app.listen(port, () => {
  console.log(`EarthScape API listening on http://localhost:${port}`);
});
