import assert from "node:assert/strict";
import test from "node:test";
import { Observation } from "../src/modules/observations/observation.model.js";
import { User } from "../src/modules/users/user.model.js";

test("observation accepts supported climate data with coordinates and measurements", () => {
  const observation = new Observation({
    sourceType: "weather_station",
    sourceId: "station-042",
    observedAt: "2026-11-03T10:00:00Z",
    location: { latitude: 34.05, longitude: -118.24 },
    measurements: [{ name: "temperature", value: 28.4, unit: "°C" }]
  });

  assert.equal(observation.validateSync(), undefined);
});

test("observation rejects unsupported source types and out-of-range coordinates", () => {
  const observation = new Observation({
    sourceType: "unknown",
    sourceId: "sensor-1",
    observedAt: "2026-11-03T10:00:00Z",
    location: { latitude: 91, longitude: -181 },
    measurements: [{ name: "temperature", value: 28.4, unit: "°C" }]
  });

  const error = observation.validateSync();

  assert.ok(error);
  assert.ok(error.errors.sourceType);
  assert.ok(error.errors["location.latitude"]);
  assert.ok(error.errors["location.longitude"]);
});

test("user records only accept the supported roles", () => {
  const user = new User({
    email: "analyst@example.org",
    password: "a-hashed-password",
    role: "superuser"
  });

  assert.ok(user.validateSync().errors.role);
  assert.equal(User.schema.path("password").options.select, false);
});
