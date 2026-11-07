import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import { Dataset } from "../src/modules/datasets/dataset.model.js";

test("dataset model accepts climate processing statuses and stores results", () => {
  for (const processingStatus of ["queued", "processing", "completed", "failed"]) {
    const dataset = new Dataset({
      name: "Climate observations",
      datasetType: "weather_station",
      fileFormat: "CSV",
      uploadedBy: new mongoose.Types.ObjectId(),
      processingStatus,
      processingResults: {
        record_count: 12,
        anomaly_count: 1
      }
    });

    assert.equal(dataset.validateSync(), undefined);
    assert.equal(dataset.processingStatus, processingStatus);
    assert.equal(dataset.processingResults.record_count, 12);
  }
});
