import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export class LocalClimateStorageError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "LocalClimateStorageError";
    this.statusCode = 502;
  }
}

export function createLocalClimateStorage({ rootDirectory }) {
  if (!rootDirectory) {
    throw new Error("A local climate storage directory is required.");
  }

  const resolvedRoot = path.resolve(rootDirectory);

  function resolveStoragePath(storagePath) {
    if (
      typeof storagePath !== "string" ||
      !storagePath.trim() ||
      storagePath.startsWith("/") ||
      /^[a-zA-Z]:/.test(storagePath) ||
      storagePath.split(/[\\/]/).some((part) => !part || part === "." || part === "..")
    ) {
      throw new Error("Climate storage paths must be non-empty relative paths without traversal segments.");
    }

    const targetPath = path.resolve(resolvedRoot, ...storagePath.split(/[\\/]/));
    const relativePath = path.relative(resolvedRoot, targetPath);
    if (relativePath.startsWith(`..${path.sep}`) || relativePath === ".." || path.isAbsolute(relativePath)) {
      throw new Error("Climate storage paths must remain inside the configured storage directory.");
    }
    return targetPath;
  }

  async function removeFile(storagePath) {
    const targetPath = resolveStoragePath(storagePath);
    try {
      await unlink(targetPath);
    } catch (error) {
      if (error.code === "ENOENT") return;
      const code = error.code ? ` (${error.code})` : "";
      throw new LocalClimateStorageError(`Could not delete climate file from local storage${code}.`, {
        cause: error
      });
    }
  }

  return {
    stagingDirectory: path.join(resolvedRoot, ".staging"),

    async writeFile(storagePath, content) {
      const targetPath = resolveStoragePath(storagePath);
      try {
        await mkdir(path.dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, { flag: "wx" });
      } catch (error) {
        const code = error.code ? ` (${error.code})` : "";
        throw new LocalClimateStorageError(`Could not write climate file to local storage${code}.`, {
          cause: error
        });
      }
    },

    async moveFile(sourcePath, storagePath) {
      const targetPath = resolveStoragePath(storagePath);
      const source = path.resolve(sourcePath);
      const stagingDirectory = path.join(resolvedRoot, ".staging");
      const relativeSource = path.relative(stagingDirectory, source);
      if (
        relativeSource.startsWith(`..${path.sep}`) ||
        relativeSource === ".." ||
        path.isAbsolute(relativeSource)
      ) {
        throw new Error("Uploaded files must originate in the climate storage staging directory.");
      }

      try {
        await mkdir(path.dirname(targetPath), { recursive: true });
        await rename(source, targetPath);
      } catch (error) {
        const code = error.code ? ` (${error.code})` : "";
        throw new LocalClimateStorageError(`Could not move uploaded climate file into local storage${code}.`, {
          cause: error
        });
      }
    },

    deleteFile: removeFile,

    async deleteStagedFile(filename) {
      const stagedPath = path.join(resolvedRoot, ".staging", path.basename(filename));
      const relativePath = path.relative(resolvedRoot, stagedPath);
      await removeFile(relativePath);
    }
  };
}
