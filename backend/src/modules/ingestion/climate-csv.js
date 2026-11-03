import { parse } from "csv-parse/sync";

const REQUIRED_COLUMNS = [
  "sourceType",
  "sourceId",
  "observedAt",
  "latitude",
  "longitude",
  "measurementName",
  "value",
  "unit"
];
const OPTIONAL_COLUMNS = ["quality"];
const SOURCE_TYPES = new Set(["satellite", "weather_station", "environmental_sensor"]);
const QUALITIES = new Set(["valid", "needs_review"]);
export const MAX_CSV_ROWS = 5000;

export class ClimateCsvError extends Error {}

function invalidRow(rowNumber, message) {
  return new ClimateCsvError(`CSV row ${rowNumber}: ${message}`);
}

function requiredText(value, field, rowNumber, maxLength) {
  const normalized = value.trim();
  if (!normalized) {
    throw invalidRow(rowNumber, `${field} is required.`);
  }
  if (normalized.length > maxLength) {
    throw invalidRow(rowNumber, `${field} must be ${maxLength} characters or fewer.`);
  }
  return normalized;
}

function finiteNumber(value, field, rowNumber) {
  const normalized = value.trim();
  if (!normalized) {
    throw invalidRow(rowNumber, `${field} is required.`);
  }
  const number = Number(normalized);
  if (!Number.isFinite(number)) {
    throw invalidRow(rowNumber, `${field} must be a finite number.`);
  }
  return number;
}

function parseObservation(row, rowNumber) {
  const sourceType = requiredText(row.sourceType, "sourceType", rowNumber, 40);
  if (!SOURCE_TYPES.has(sourceType)) {
    throw invalidRow(rowNumber, "sourceType must be satellite, weather_station, or environmental_sensor.");
  }

  const observedAt = row.observedAt.trim();
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(observedAt) || !Number.isFinite(Date.parse(observedAt))) {
    throw invalidRow(rowNumber, "observedAt must be an ISO 8601 timestamp that includes a timezone, such as 2026-11-03T10:00:00Z.");
  }

  const latitude = finiteNumber(row.latitude, "latitude", rowNumber);
  const longitude = finiteNumber(row.longitude, "longitude", rowNumber);
  if (latitude < -90 || latitude > 90) {
    throw invalidRow(rowNumber, "latitude must be between -90 and 90.");
  }
  if (longitude < -180 || longitude > 180) {
    throw invalidRow(rowNumber, "longitude must be between -180 and 180.");
  }

  const quality = row.quality?.trim() || "valid";
  if (!QUALITIES.has(quality)) {
    throw invalidRow(rowNumber, "quality must be valid or needs_review.");
  }

  return {
    sourceType,
    sourceId: requiredText(row.sourceId, "sourceId", rowNumber, 100),
    observedAt: new Date(observedAt),
    location: { latitude, longitude },
    measurements: [{
      name: requiredText(row.measurementName, "measurementName", rowNumber, 100),
      value: finiteNumber(row.value, "value", rowNumber),
      unit: requiredText(row.unit, "unit", rowNumber, 32)
    }],
    quality
  };
}

export function parseClimateCsv(buffer) {
  let rows;
  try {
    rows = parse(buffer, {
      bom: true,
      skip_empty_lines: true,
      trim: true,
      max_record_size: 16 * 1024
    });
  } catch (error) {
    throw new ClimateCsvError(`CSV format error: ${error.message}`);
  }

  if (rows.length < 2) {
    throw new ClimateCsvError("CSV must contain a header and at least one observation row.");
  }

  const [headers, ...dataRows] = rows;
  if (dataRows.length > MAX_CSV_ROWS) {
    throw new ClimateCsvError(`CSV contains too many rows. The limit is ${MAX_CSV_ROWS}.`);
  }

  if (headers.some((header) => !header)) {
    throw new ClimateCsvError("CSV header names cannot be empty.");
  }
  if (new Set(headers).size !== headers.length) {
    throw new ClimateCsvError("CSV column names must be unique.");
  }

  const allowedColumns = new Set([...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]);
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  const unknownColumns = headers.filter((column) => !allowedColumns.has(column));
  if (missingColumns.length || unknownColumns.length) {
    const problems = [];
    if (missingColumns.length) problems.push(`missing columns: ${missingColumns.join(", ")}`);
    if (unknownColumns.length) problems.push(`unknown columns: ${unknownColumns.join(", ")}`);
    throw new ClimateCsvError(`CSV headers are invalid (${problems.join("; ")}).`);
  }

  return dataRows.map((values, index) => {
    const rowNumber = index + 2;
    if (values.length !== headers.length) {
      throw invalidRow(rowNumber, `expected ${headers.length} columns but found ${values.length}.`);
    }

    return parseObservation(
      Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex]])),
      rowNumber
    );
  });
}
