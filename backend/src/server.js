import "dotenv/config";
import { createApp } from "./app.js";
import { connectToDatabase } from "./config/database.js";
import { createWebHdfsClient } from "./services/webhdfs.service.js";

const port = Number(process.env.PORT ?? 5000);
const mongoUri = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/earthscape_climate";
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const jwtSecret = process.env.JWT_SECRET;
const hdfsWebHdfsUrl = process.env.HDFS_WEBHDFS_URL;
const hdfsUser = process.env.HDFS_USER;
const hdfsDataNodeHosts = (process.env.HDFS_DATANODE_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

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

if (Boolean(hdfsWebHdfsUrl) !== Boolean(hdfsUser)) {
  throw new Error("Set both HDFS_WEBHDFS_URL and HDFS_USER, or leave both empty to disable climate CSV uploads.");
}

const hdfsClient = hdfsWebHdfsUrl
  ? createWebHdfsClient({
    baseUrl: hdfsWebHdfsUrl,
    username: hdfsUser,
    allowedDataNodeHosts: hdfsDataNodeHosts
  })
  : undefined;

const app = createApp({ frontendOrigin, jwtSecret, hdfsClient });
app.listen(port, () => {
  console.log(`EarthScape API listening on http://localhost:${port}`);
});
