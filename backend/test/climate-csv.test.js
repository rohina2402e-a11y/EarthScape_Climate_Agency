import assert from "node:assert/strict";
import test from "node:test";
import { ClimateCsvError, MAX_CSV_ROWS, parseClimateCsv } from "../src/modules/ingestion/climate-csv.js";

const header = "sourceType,sourceId,observedAt,latitude,longitude,measurementName,value,unit,quality";

test("CSV parser maps valid rows into climate observations", () => {
  const csv = `${header}\nweather_station,station-042,2026-11-03T10:00:00Z,34.05,-118.24,temperature,28.4,°C,valid`;
  const [observation] = parseClimateCsv(Buffer.from(csv));

  assert.equal(observation.sourceType, "weather_station");
  assert.equal(observation.sourceId, "station-042");
  assert.equal(observation.observedAt.toISOString(), "2026-11-03T10:00:00.000Z");
  assert.deepEqual(observation.location, { latitude: 34.05, longitude: -118.24 });
  assert.deepEqual(observation.measurements, [{ name: "temperature", value: 28.4, unit: "°C" }]);
  assert.equal(observation.quality, "valid");
});

test("CSV parser accepts optional quality and whitespace around values", () => {
  const csv = [
    "unit,value,measurementName,longitude,latitude,observedAt,sourceId,sourceType",
    " °C , 28.4 , temperature , -118.24 , 34.05 , 2026-11-03T10:00:00-08:00 , station-042 , weather_station "
  ].join("\n");
  const [observation] = parseClimateCsv(Buffer.from(csv));

  assert.equal(observation.quality, "valid");
  assert.equal(observation.observedAt.toISOString(), "2026-11-03T18:00:00.000Z");
});

test("CSV parser rejects missing, duplicate, or unknown headers", () => {
  assert.throws(
    () => parseClimateCsv(Buffer.from("sourceType,sourceType\nsatellite,satellite")),
    /column names must be unique/
  );
  assert.throws(
    () => parseClimateCsv(Buffer.from("sourceType,sourceId\nsatellite,source")),
    /missing columns/
  );
  assert.throws(
    () => parseClimateCsv(Buffer.from(`${header},unexpected\nweather_station,station-1,2026-11-03T10:00:00Z,34,-118,temp,20,C,valid,x`)),
    /unknown columns/
  );
});

test("CSV parser rejects invalid timestamps, coordinates, and measurement values", () => {
  const invalidTimestamp = `${header}\nweather_station,s-1,2026-11-03T10:00:00,34,-118,temp,20,C,valid`;
  assert.throws(() => parseClimateCsv(Buffer.from(invalidTimestamp)), /must be an ISO 8601 timestamp/);

  const invalidLatitude = `${header}\nweather_station,s-1,2026-11-03T10:00:00Z,91,-118,temp,20,C,valid`;
  assert.throws(() => parseClimateCsv(Buffer.from(invalidLatitude)), /latitude must be between/);

  const invalidValue = `${header}\nweather_station,s-1,2026-11-03T10:00:00Z,34,-118,temp,NaN,C,valid`;
  assert.throws(() => parseClimateCsv(Buffer.from(invalidValue)), /value must be a finite number/);
});

test("CSV parser rejects empty files, malformed rows, and excessive row counts", () => {
  assert.throws(() => parseClimateCsv(Buffer.from("")), ClimateCsvError);
  assert.throws(
    () => parseClimateCsv(Buffer.from(`${header}\nweather_station,s-1`)),
    /Invalid Record Length|expected 9 columns/
  );

  const rows = Array.from({ length: MAX_CSV_ROWS + 1 }, () =>
    "weather_station,s-1,2026-11-03T10:00:00Z,34,-118,temp,20,C,valid"
  );
  assert.throws(() => parseClimateCsv(Buffer.from([header, ...rows].join("\n"))), /limit is 5000/);
});
