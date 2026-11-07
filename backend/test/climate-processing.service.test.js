import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ClimateProcessingError,
  createClimateProcessor
} from "../src/services/climate-processing.service.js";

test("climate processor posts the file to its bound Python service", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url.href, "https://climate-processor.internal/process");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["X-Climate-File-Format"], "CSV");
    assert.equal(options.body.toString(), "observedAt,temperature");
    return {
      ok: true,
      async json() {
        return { record_count: 7 };
      }
    };
  };

  try {
    const processFile = createClimateProcessor({
      getServiceUrl: () => "https://climate-processor.internal/"
    });
    assert.deepEqual(
      await processFile({ content: Buffer.from("observedAt,temperature"), fileFormat: "CSV" }),
      { record_count: 7 }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("climate processor reports missing service bindings", async () => {
  const processFile = createClimateProcessor({ getServiceUrl: () => undefined });
  await assert.rejects(
    processFile({ content: Buffer.from("{}"), fileFormat: "JSON" }),
    ClimateProcessingError
  );
});
