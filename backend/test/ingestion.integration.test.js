import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { hashPassword, createAccessToken } from "../src/services/auth.service.js";
import { Observation } from "../src/modules/observations/observation.model.js";
import { ClimateUpload } from "../src/modules/ingestion/climate-upload.model.js";
import { Dataset } from "../src/modules/datasets/dataset.model.js";
import { User } from "../src/modules/users/user.model.js";
import {
  createLocalClimateStorage,
  LocalClimateStorageError
} from "../src/services/local-climate-storage.service.js";

const mongoTestUri = process.env.MONGO_TEST_URI;
const jwtSecret = "integration-test-secret-with-at-least-thirty-two-bytes";

test("authenticated CSV imports create observations and upload history", { skip: !mongoTestUri }, async (t) => {
  assert.match(
    mongoTestUri,
    /earthscape_ingestion_test(?:_[a-z0-9_-]+)?(?:\?|$)/i,
    "MONGO_TEST_URI must use a dedicated earthscape_ingestion_test database."
  );
  await mongoose.connect(mongoTestUri);
  t.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  const analyst = await User.create({
    email: "analyst@example.org",
    password: await hashPassword("test-password-123"),
    role: "analyst"
  });
  const otherAnalyst = await User.create({
    email: "other@example.org",
    password: await hashPassword("other-password-123"),
    role: "analyst"
  });
  const admin = await User.create({
    email: "admin@example.org",
    password: await hashPassword("admin-password-123"),
    role: "admin"
  });
  const unconfiguredServer = createApp({
    frontendOrigin: "http://localhost:5173",
    jwtSecret
  }).listen(0);
  await new Promise((resolve) => unconfiguredServer.once("listening", resolve));
  const noStorageForm = new FormData();
  noStorageForm.append(
    "file",
    new Blob(["sourceType,sourceId"], { type: "text/csv" }),
    "sample.csv"
  );
  const unavailableStorageResponse = await fetch(
    `http://127.0.0.1:${unconfiguredServer.address().port}/api/ingestion/uploads`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${createAccessToken(admin, jwtSecret)}` },
      body: noStorageForm
    }
  );
  await new Promise((resolve, reject) => {
    unconfiguredServer.close((error) => (error ? reject(error) : resolve()));
  });
  assert.equal(unavailableStorageResponse.status, 503);
  assert.match((await unavailableStorageResponse.json()).error, /Local climate file storage is not configured/);
  assert.equal(await ClimateUpload.countDocuments(), 0);

  const storageDirectory = await mkdtemp(path.join(tmpdir(), "earthscape-climate-test-"));
  t.after(async () => {
    await rm(storageDirectory, { recursive: true, force: true });
  });
  const localStorage = createLocalClimateStorage({ rootDirectory: storageDirectory });
  const datasetStorage = createLocalClimateStorage({
    rootDirectory: path.join(storageDirectory, "datasets")
  });
  const climateStorage = {
    async writeFile(storagePath, content) {
      if (content.toString().includes("storage-unavailable")) {
        throw new LocalClimateStorageError("Could not write climate file: simulated disk error.");
      }
      return localStorage.writeFile(storagePath, content);
    },
    deleteFile: (storagePath) => localStorage.deleteFile(storagePath)
  };
  const server = createApp({
    frontendOrigin: "http://localhost:5173",
    jwtSecret,
    climateStorage,
    datasetStorage
  }).listen(0);
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const token = createAccessToken(analyst, jwtSecret);
  const otherToken = createAccessToken(otherAnalyst, jwtSecret);
  const adminToken = createAccessToken(admin, jwtSecret);
  const csv = [
    "sourceType,sourceId,observedAt,latitude,longitude,measurementName,value,unit,quality",
    "weather_station,station-042,2026-11-03T10:00:00Z,34.05,-118.24,temperature,28.4,°C,valid",
    "environmental_sensor,sensor-123,2026-11-03T10:05:00Z,35.1,-117.9,humidity,42,percent,needs_review"
  ].join("\n");

  async function upload(content, filename = "climate.csv", accessToken = adminToken) {
    const form = new FormData();
    form.append("file", new Blob([content], { type: "text/csv" }), filename);
    return fetch(`${baseUrl}/api/ingestion/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form
    });
  }

  assert.equal((await upload(csv, "climate.csv", token)).status, 403);
  const response = await upload(csv);
  assert.equal(response.status, 201);
  const { upload: completedUpload } = await response.json();
  assert.equal(completedUpload.status, "completed");
  assert.equal(completedUpload.recordCount, 2);
  assert.match(completedUpload.storagePath, /^uploads\/[^/]+\/[^/]+-[a-f0-9]{64}\.csv$/);
  assert.equal(await readFile(path.join(storageDirectory, completedUpload.storagePath), "utf8"), csv);

  const observationsResponse = await fetch(`${baseUrl}/api/observations`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal((await observationsResponse.json()).observations.length, 2);

  const adminHistoryResponse = await fetch(`${baseUrl}/api/ingestion/uploads`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal((await adminHistoryResponse.json()).uploads.length, 1);

  const otherHistoryResponse = await fetch(`${baseUrl}/api/ingestion/uploads`, {
    headers: { Authorization: `Bearer ${otherToken}` }
  });
  assert.equal((await otherHistoryResponse.json()).uploads.length, 0);

  assert.equal((await upload(csv)).status, 409);

  const invalidCsv = [
    "sourceType,sourceId,observedAt,latitude,longitude,measurementName,value,unit",
    "weather_station,station-999,2026-11-03T10:00:00Z,95,-118,temperature,28.4,°C"
  ].join("\n");
  const invalidResponse = await upload(invalidCsv, "invalid.csv");
  assert.equal(invalidResponse.status, 400);
  const { upload: failedUpload } = await invalidResponse.json();
  assert.equal(failedUpload.status, "failed");
  assert.equal(await Observation.countDocuments(), 2);

  async function uploadDataset(accessToken, filename = "sample-weather.csv") {
    const form = new FormData();
    form.append("name", "Sample weather observations");
    form.append("datasetType", "weather_station");
    form.append(
      "file",
      new Blob(["date,temperature\n2026-11-03,18"], { type: "text/csv" }),
      filename
    );
    return fetch(`${baseUrl}/api/datasets/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form
    });
  }

  assert.equal((await uploadDataset(token)).status, 403);
  assert.equal(await Dataset.countDocuments({ originalFilename: "sample-weather.csv" }), 0);

  const datasetResponse = await uploadDataset(adminToken);
  assert.equal(datasetResponse.status, 201);
  const { dataset } = await datasetResponse.json();
  assert.equal(dataset.name, "Sample weather observations");
  assert.equal(dataset.datasetType, "weather_station");
  assert.equal(dataset.fileFormat, "CSV");
  assert.equal(dataset.fileSize, Buffer.byteLength("date,temperature\n2026-11-03,18"));
  assert.equal(dataset.processingStatus, "queued");
  assert.match(dataset.storagePath, /^weather\/[a-f0-9-]+\.csv$/);
  assert.equal(
    await readFile(path.join(storageDirectory, "datasets", dataset.storagePath), "utf8"),
    "date,temperature\n2026-11-03,18"
  );

  const datasetsResponse = await fetch(`${baseUrl}/api/datasets`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(datasetsResponse.status, 200);
  assert.ok((await datasetsResponse.json()).datasets.some((item) => item.id === dataset.id));

  const deniedDeleteResponse = await fetch(`${baseUrl}/api/datasets/${dataset.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(deniedDeleteResponse.status, 403);

  const deleteResponse = await fetch(`${baseUrl}/api/datasets/${dataset.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(deleteResponse.status, 200);
  await assert.rejects(readFile(path.join(storageDirectory, "datasets", dataset.storagePath)));
  assert.equal(await Dataset.findById(dataset.id), null);
  assert.equal(await ClimateUpload.countDocuments({ status: "failed" }), 1);
  const unavailableCsv = [
    "sourceType,sourceId,observedAt,latitude,longitude,measurementName,value,unit",
    "weather_station,storage-unavailable,2026-11-03T10:00:00Z,34,-118,temperature,20,C"
  ].join("\n");
  const unavailableResponse = await upload(unavailableCsv, "storage-unavailable.csv");
  assert.equal(unavailableResponse.status, 502);
  const { upload: unavailableUpload } = await unavailableResponse.json();
  assert.equal(unavailableUpload.status, "failed");
  assert.match(unavailableUpload.errorMessage, /simulated disk error/);
  assert.equal(await Observation.countDocuments(), 2);
});
