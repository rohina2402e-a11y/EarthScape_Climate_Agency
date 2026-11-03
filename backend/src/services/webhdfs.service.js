const REQUEST_TIMEOUT_MS = 15_000;

export class WebHdfsError extends Error {
  constructor(message) {
    super(message);
    this.name = "WebHdfsError";
    this.statusCode = 502;
  }
}

function assertSuccessful(response, operation) {
  if (!response.ok) {
    throw new WebHdfsError(`HDFS ${operation} failed with HTTP ${response.status}.`);
  }
}

function encodeHdfsPath(hdfsPath) {
  return hdfsPath.split("/").map(encodeURIComponent).join("/");
}

export function createWebHdfsClient({
  baseUrl,
  username,
  allowedDataNodeHosts = [],
  fetchImpl = fetch
}) {
  if (!baseUrl || !username) {
    throw new Error("HDFS WebHDFS URL and username are required.");
  }

  const nameNodeUrl = new URL(baseUrl);
  if (!["http:", "https:"].includes(nameNodeUrl.protocol) || nameNodeUrl.username || nameNodeUrl.password) {
    throw new Error("HDFS WebHDFS URL must use HTTP or HTTPS and must not contain credentials.");
  }

  const allowedHosts = new Set([
    nameNodeUrl.hostname.toLowerCase(),
    ...allowedDataNodeHosts.map((host) => host.trim().toLowerCase()).filter(Boolean)
  ]);
  const normalizedUsername = username.trim();
  if (!normalizedUsername || /[\u0000-\u001f\u007f]/.test(normalizedUsername)) {
    throw new Error("HDFS username must be a non-empty value without control characters.");
  }

  async function request(url, options = {}) {
    try {
      return await fetchImpl(url, {
        ...options,
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      throw new WebHdfsError(`Could not reach HDFS WebHDFS: ${error.message}`);
    }
  }

  function operationUrl(hdfsPath, operation) {
    const url = new URL(`/webhdfs/v1${encodeHdfsPath(hdfsPath)}`, nameNodeUrl);
    url.searchParams.set("op", operation);
    url.searchParams.set("user.name", normalizedUsername);
    return url;
  }

  function validateDataNodeUrl(location) {
    let dataNodeUrl;
    try {
      dataNodeUrl = new URL(location, nameNodeUrl);
    } catch {
      throw new WebHdfsError("HDFS returned an invalid DataNode upload URL.");
    }

    if (
      dataNodeUrl.protocol !== nameNodeUrl.protocol ||
      dataNodeUrl.username ||
      dataNodeUrl.password ||
      !allowedHosts.has(dataNodeUrl.hostname.toLowerCase())
    ) {
      throw new WebHdfsError(
        "HDFS redirected the upload to a DataNode host that is not allowed. Check HDFS_DATANODE_HOSTS."
      );
    }

    return dataNodeUrl;
  }

  return {
    async writeFile(hdfsPath, buffer) {
      const directory = hdfsPath.slice(0, hdfsPath.lastIndexOf("/")) || "/";
      const mkdirResponse = await request(operationUrl(directory, "MKDIRS"), { method: "PUT" });
      assertSuccessful(mkdirResponse, "directory creation");

      const createResponse = await request(operationUrl(hdfsPath, "CREATE"), {
        method: "PUT",
        headers: { "Content-Length": String(buffer.byteLength) }
      });

      if (createResponse.status !== 307) {
        throw new WebHdfsError(`HDFS file creation was not redirected as expected (HTTP ${createResponse.status}).`);
      }

      const location = createResponse.headers.get("location");
      if (!location) {
        throw new WebHdfsError("HDFS did not provide a DataNode upload location.");
      }

      const dataNodeUrl = validateDataNodeUrl(location);
      const writeResponse = await request(dataNodeUrl, {
        method: "PUT",
        headers: { "Content-Length": String(buffer.byteLength) },
        body: buffer
      });
      if (writeResponse.status !== 201) {
        throw new WebHdfsError(`HDFS did not confirm the file upload (HTTP ${writeResponse.status}).`);
      }

      return hdfsPath;
    },

    async deleteFile(hdfsPath) {
      const url = operationUrl(hdfsPath, "DELETE");
      const response = await request(url, { method: "DELETE" });
      assertSuccessful(response, "file cleanup");
    }
  };
}
