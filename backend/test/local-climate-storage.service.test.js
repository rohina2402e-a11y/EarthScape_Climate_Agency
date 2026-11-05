import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  createLocalClimateStorage,
  LocalClimateStorageError
} from "../src/services/local-climate-storage.service.js";

test("local climate storage creates directories, writes files, and deletes files", async (t) => {
  const rootDirectory = await mkdtemp(path.join(tmpdir(), "earthscape-climate-"));
  t.after(async () => {
    await rm(rootDirectory, { recursive: true, force: true });
  });
  const storage = createLocalClimateStorage({ rootDirectory });
  const filePath = "weather/station-1/sample.csv";

  await storage.writeFile(filePath, Buffer.from("temperature\n22"));
  assert.equal(await readFile(path.join(rootDirectory, filePath), "utf8"), "temperature\n22");

  await storage.deleteFile(filePath);
  await assert.rejects(readFile(path.join(rootDirectory, filePath)));
  await storage.deleteFile(filePath);
});

test("local climate storage moves staged uploads into organized folders", async (t) => {
  const rootDirectory = await mkdtemp(path.join(tmpdir(), "earthscape-climate-"));
  t.after(async () => {
    await rm(rootDirectory, { recursive: true, force: true });
  });
  const storage = createLocalClimateStorage({ rootDirectory });
  await mkdir(storage.stagingDirectory, { recursive: true });
  await writeFile(path.join(storage.stagingDirectory, "upload-id"), "dataset content");

  await storage.moveFile(
    path.join(storage.stagingDirectory, "upload-id"),
    "satellite/dataset.csv"
  );
  assert.equal(await readFile(path.join(rootDirectory, "satellite", "dataset.csv"), "utf8"), "dataset content");
  await storage.deleteFile("satellite/dataset.csv");
});

test("local climate storage rejects paths outside its root", async () => {
  const storage = createLocalClimateStorage({ rootDirectory: tmpdir() });

  await assert.rejects(
    storage.writeFile("../outside.csv", Buffer.from("not allowed")),
    /relative paths without traversal segments/
  );
  await assert.rejects(
    storage.deleteFile("C:\\outside.csv"),
    /relative paths without traversal segments/
  );
});

test("local climate storage reports filesystem write failures", async (t) => {
  const rootDirectory = await mkdtemp(path.join(tmpdir(), "earthscape-climate-"));
  t.after(async () => {
    await rm(rootDirectory, { recursive: true, force: true });
  });
  const storage = createLocalClimateStorage({ rootDirectory });

  await storage.writeFile("weather/sample.csv", Buffer.from("first"));
  await assert.rejects(
    storage.writeFile("weather/sample.csv", Buffer.from("duplicate")),
    (error) => error instanceof LocalClimateStorageError && error.statusCode === 502
  );
});
