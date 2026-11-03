import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../src/app.js";

const server = createApp({
  frontendOrigin: "http://localhost:5173",
  jwtSecret: "test-secret-with-at-least-thirty-two-bytes"
}).listen(0);
let baseUrl;

before(async () => {
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("health endpoint reports when MongoDB is disconnected", async () => {
  const response = await fetch(`${baseUrl}/api/health`);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    status: "unavailable",
    database: "disconnected",
    hdfs: "unconfigured"
  });
});

test("climate data requires authentication", async () => {
  const response = await fetch(`${baseUrl}/api/observations`);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Authentication is required." });
});

test("admin account management requires authentication", async () => {
  const response = await fetch(`${baseUrl}/api/users`, { method: "POST" });
  assert.equal(response.status, 401);
});

test("climate file ingestion requires authentication", async () => {
  const form = new FormData();
  form.append("file", new Blob(["sourceType,sourceId"], { type: "text/csv" }), "sample.csv");
  const response = await fetch(`${baseUrl}/api/ingestion/uploads`, {
    method: "POST",
    body: form
  });
  assert.equal(response.status, 401);
});

test("climate CSV imports require configured HDFS storage", async () => {
  const form = new FormData();
  form.append(
    "file",
    new Blob(["sourceType,sourceId"], { type: "text/csv" }),
    "sample.csv"
  );
  const response = await fetch(`${baseUrl}/api/ingestion/uploads`, {
    method: "POST",
    headers: { Authorization: "Bearer not-a-valid-token" },
    body: form
  });
  assert.equal(response.status, 401);
});

test("password changes require an authenticated account", async () => {
  const response = await fetch(`${baseUrl}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword: "old-password", newPassword: "new-password-123" })
  });
  assert.equal(response.status, 401);
});

test("invalid bearer tokens cannot access climate observations", async () => {
  const response = await fetch(`${baseUrl}/api/observations`, {
    headers: { Authorization: "Bearer not-a-valid-token" }
  });
  assert.equal(response.status, 401);
});

test("malformed JSON receives a client error", async () => {
  const response = await fetch(`${baseUrl}/api/observations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{invalid"
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Request body must be valid JSON."
  });
});
