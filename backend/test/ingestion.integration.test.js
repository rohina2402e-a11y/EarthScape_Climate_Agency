import assert from "node:assert/strict";
import { after, test } from "node:test";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { hashPassword, createAccessToken } from "../src/services/auth.service.js";
import { Observation } from "../src/modules/observations/observation.model.js";
import { ClimateUpload } from "../src/modules/ingestion/climate-upload.model.js";
import { User } from "../src/modules/users/user.model.js";
import { WebHdfsError } from "../src/services/webhdfs.service.js";

const mongoTestUri = process.env.MONGO_TEST_URI;
const jwtSecret = "integration-test-secret-with-at-least-thirty-two-bytes";

test("authenticated CSV imports create observations and upload history", { skip: !mongoTestUri }, async (t) => {
  assert.match(mongoTestUri, /earthscape_ingestion_test(?:\?|$)/, "MONGO_TEST_URI must use the dedicated earthscape_ingestion_test database.");
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
  const unconfiguredServer = createApp({
    frontendOrigin: "http://localhost:5173",
    jwtSecret
  }).listen(0);
  await new Promise((resolve) => unconfiguredServer.once("listening", resolve));
  const noHdfsForm = new FormData();
  noHdfsForm.append(
    "file",
    new Blob(["sourceType,sourceId"], { type: "text/csv" }),
    "sample.csv"
  );
  const unavailableStorageResponse = await fetch(
    `http://127.0.0.1:${unconfiguredServer.address().port}/api/ingestion/uploads`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${createAccessToken(analyst, jwtSecret)}` },
      body: noHdfsForm
    }
  );
  await new Promise((resolve, reject) => {
    unconfiguredServer.close((error) => (error ? reject(error) : resolve()));
  });
  assert.equal(unavailableStorageResponse.status, 503);
  assert.match((await unavailableStorageResponse.json()).error, /HDFS storage is not configured/);
  assert.equal(await ClimateUpload.countDocuments(), 0);

  const hdfsWrites = [];
  const hdfsDeletes = [];
  const hdfsClient = {
    async writeFile(path, content) {
      if (content.toString().includes("hdfs-unavailable")) {
        throw new WebHdfsError("Could not reach HDFS WebHDFS: connection refused");
      }
      hdfsWrites.push({ path, content });
    },
    async deleteFile(path) {
      hdfsDeletes.push(path);
    }
  };
  const server = createApp({ frontendOrigin: "http://localhost:5173", jwtSecret, hdfsClient }).listen(0);
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });
  await new Promise((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const token = createAccessToken(analyst, jwtSecret);
  const otherToken = createAccessToken(otherAnalyst, jwtSecret);
  const csv = [
    "sourceType,sourceId,observedAt,latitude,longitude,measurementName,value,unit,quality",
    "weather_station,station-042,2026-11-03T10:00:00Z,34.05,-118.24,temperature,28.4,°C,valid",
    "environmental_sensor,sensor-123,2026-11-03T10:05:00Z,35.1,-117.9,humidity,42,percent,needs_review"
  ].join("\n");

  async function upload(content, filename = "climate.csv", accessToken = token) {
    const form = new FormData();
    form.append("file", new Blob([content], { type: "text/csv" }), filename);
    return fetch(`${baseUrl}/api/ingestion/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form
    });
  }

  const response = await upload(csv);
  assert.equal(response.status, 201);
  const { upload: completedUpload } = await response.json();
  assert.equal(completedUpload.status, "completed");
  assert.equal(completedUpload.recordCount, 2);
  assert.match(completedUpload.hdfsPath, /^\/earthscape\/uploads\/[^/]+\/[^/]+-[a-f0-9]{64}\.csv$/);
  assert.equal(hdfsWrites.length, 1);
  assert.equal(hdfsWrites[0].path, completedUpload.hdfsPath);
  assert.equal(hdfsWrites[0].content.toString(), csv);

  const observationsResponse = await fetch(`${baseUrl}/api/observations`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal((await observationsResponse.json()).observations.length, 2);

  const ownHistoryResponse = await fetch(`${baseUrl}/api/ingestion/uploads`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal((await ownHistoryResponse.json()).uploads.length, 1);

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
  assert.equal(await ClimateUpload.countDocuments({ status: "failed" }), 1);
  assert.equal(hdfsWrites.length, 1);
  assert.deepEqual(hdfsDeletes, []);

  const unavailableCsv = [
    "sourceType,sourceId,observedAt,latitude,longitude,measurementName,value,unit",
    "weather_station,hdfs-unavailable,2026-11-03T10:00:00Z,34,-118,temperature,20,C"
  ].join("\n");
  const unavailableResponse = await upload(unavailableCsv, "hdfs-unavailable.csv");
  assert.equal(unavailableResponse.status, 502);
  const { upload: unavailableUpload } = await unavailableResponse.json();
  assert.equal(unavailableUpload.status, "failed");
  assert.match(unavailableUpload.errorMessage, /Could not reach HDFS/);
  assert.equal(await Observation.countDocuments(), 2);
  assert.equal(hdfsDeletes.length, 1);
});
