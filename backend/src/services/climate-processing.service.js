import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROCESSING_SCRIPT = fileURLToPath(
  new URL("../../../machine-learning/scripts/process_dataset.py", import.meta.url)
);

export class ClimateProcessingError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ClimateProcessingError";
  }
}

export function createClimateProcessor({ pythonExecutable = "python", dataDirectory }) {
  if (!dataDirectory) {
    throw new Error("A climate dataset storage directory is required.");
  }
  const resolvedDataDirectory = path.resolve(dataDirectory);

  return async function processClimateDataset(storagePath) {
    if (
      typeof storagePath !== "string" ||
      !storagePath.trim() ||
      storagePath.split(/[\\/]/).some((part) => !part || part === "." || part === "..")
    ) {
      throw new Error("Climate dataset paths must be relative paths without traversal segments.");
    }

    const filePath = path.resolve(resolvedDataDirectory, ...storagePath.split(/[\\/]/));
    const relativePath = path.relative(resolvedDataDirectory, filePath);
    if (relativePath.startsWith(`..${path.sep}`) || relativePath === ".." || path.isAbsolute(relativePath)) {
      throw new Error("Climate dataset paths must remain inside the configured storage directory.");
    }

    let stdout;
    try {
      ({ stdout } = await new Promise((resolve, reject) => {
        execFile(
          pythonExecutable,
          [PROCESSING_SCRIPT, filePath],
          { timeout: 120_000, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
          (error, output, stderr) => {
            if (error) {
              if (error.code === "ENOENT") {
                reject(error);
                return;
              }
              const details = stderr.trim().slice(0, 1000);
              reject(new ClimateProcessingError(
                details || "The Python climate processor exited unsuccessfully.",
                { cause: error }
              ));
              return;
            }
            resolve({ stdout: output });
          }
        );
      }));
      return JSON.parse(stdout);
    } catch (error) {
      if (error instanceof ClimateProcessingError) throw error;
      if (error instanceof SyntaxError) {
        throw new ClimateProcessingError("The Python climate processor returned invalid JSON.", {
          cause: error
        });
      }
      if (error.code === "ENOENT") {
        throw new ClimateProcessingError(
          `Python executable "${pythonExecutable}" was not found. Configure PYTHON_EXECUTABLE.`,
          { cause: error }
        );
      }
      throw new ClimateProcessingError("Could not run the Python climate processor.", {
        cause: error
      });
    }
  };
}
