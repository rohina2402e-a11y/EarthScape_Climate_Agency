import assert from "node:assert/strict";
import test from "node:test";
import { createWebHdfsClient, WebHdfsError } from "../src/services/webhdfs.service.js";

test("WebHDFS creates parent folders and uploads the file through a DataNode redirect", async () => {
  const calls = [];
  const client = createWebHdfsClient({
    baseUrl: "http://localhost:9870",
    username: "earthscape",
    fetchImpl: async (url, options) => {
      const requestUrl = new URL(url);
      calls.push({ url: requestUrl, options });

      if (requestUrl.searchParams.get("op") === "MKDIRS") {
        return new Response(JSON.stringify({ boolean: true }), { status: 200 });
      }
      if (requestUrl.searchParams.get("op") === "CREATE") {
        return new Response(null, {
          status: 307,
          headers: { location: "http://localhost:9864/webhdfs/v1/upload" }
        });
      }
      return new Response(null, { status: 201 });
    }
  });
  const content = Buffer.from("sample climate data");
  const hdfsPath = "/earthscape/uploads/user 1/data.csv";

  assert.equal(await client.writeFile(hdfsPath, content), hdfsPath);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url.searchParams.get("op"), "MKDIRS");
  assert.equal(calls[0].url.pathname, "/webhdfs/v1/earthscape/uploads/user%201");
  assert.equal(calls[1].url.searchParams.get("user.name"), "earthscape");
  assert.equal(calls[2].options.method, "PUT");
  assert.deepEqual(calls[2].options.body, content);
});

test("WebHDFS only uploads to configured DataNode hosts", async () => {
  const client = createWebHdfsClient({
    baseUrl: "http://localhost:9870",
    username: "earthscape",
    fetchImpl: async (url) => {
      if (new URL(url).searchParams.get("op") === "MKDIRS") {
        return new Response(JSON.stringify({ boolean: true }), { status: 200 });
      }
      return new Response(null, {
        status: 307,
        headers: { location: "http://untrusted.example:9864/webhdfs/v1/upload" }
      });
    }
  });

  await assert.rejects(
    client.writeFile("/earthscape/uploads/user/data.csv", Buffer.from("data")),
    (error) => error instanceof WebHdfsError && /not allowed/.test(error.message)
  );
});

test("WebHDFS surfaces connection failures as storage errors", async () => {
  const client = createWebHdfsClient({
    baseUrl: "http://localhost:9870",
    username: "earthscape",
    fetchImpl: async () => {
      throw new Error("connection refused");
    }
  });

  await assert.rejects(
    client.writeFile("/earthscape/uploads/user/data.csv", Buffer.from("data")),
    (error) => error instanceof WebHdfsError && error.statusCode === 502
  );
});

test("WebHDFS deletes incomplete upload files", async () => {
  let requestUrl;
  const client = createWebHdfsClient({
    baseUrl: "http://localhost:9870",
    username: "earthscape",
    fetchImpl: async (url, options) => {
      requestUrl = new URL(url);
      assert.equal(options.method, "DELETE");
      return new Response(JSON.stringify({ boolean: true }), { status: 200 });
    }
  });

  await client.deleteFile("/earthscape/uploads/user/data.csv");
  assert.equal(requestUrl.searchParams.get("op"), "DELETE");
  assert.equal(requestUrl.searchParams.get("user.name"), "earthscape");
});
