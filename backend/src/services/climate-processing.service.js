export class ClimateProcessingError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ClimateProcessingError";
  }
}

export function createClimateProcessor({
  getServiceUrl = () => process.env.CLIMATE_PROCESSOR_URL
    ?? (process.env.VERCEL ? undefined : "http://127.0.0.1:8000/")
} = {}) {
  return async function processClimateDataset({ content, fileFormat }) {
    const serviceUrl = getServiceUrl();
    if (!serviceUrl) {
      throw new ClimateProcessingError("The climate processor service binding is not configured.");
    }
    if (!["CSV", "JSON"].includes(fileFormat)) {
      throw new ClimateProcessingError("The Python processor supports CSV and JSON files only.");
    }

    try {
      const response = await fetch(new URL("/process", serviceUrl), {
        method: "POST",
        headers: { "X-Climate-File-Format": fileFormat },
        body: content,
        signal: AbortSignal.timeout(120_000)
      });
      let result;
      try {
        result = await response.json();
      } catch (error) {
        throw new ClimateProcessingError("The Python processor returned an invalid response.", {
          cause: error
        });
      }
      if (!response.ok) {
        throw new ClimateProcessingError(
          result.detail ?? "The Python climate processor rejected the uploaded file."
        );
      }
      return result;
    } catch (error) {
      if (error instanceof ClimateProcessingError) throw error;
      throw new ClimateProcessingError("Could not reach the Python climate processor service.", {
        cause: error
      });
    }
  };
}
