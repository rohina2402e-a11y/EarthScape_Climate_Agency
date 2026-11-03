import assert from "node:assert/strict";
import test from "node:test";
import {
  createAccessToken,
  hashPassword,
  InputError,
  validateCredentials,
  verifyAccessToken,
  verifyPassword
} from "../src/services/auth.service.js";

const secret = "test-secret-with-at-least-thirty-two-bytes";

test("credential validation enforces valid email and bcrypt-compatible passwords", () => {
  assert.doesNotThrow(() => validateCredentials("analyst@example.org", "climate-password-1"));
  assert.throws(() => validateCredentials("not-an-email", "climate-password-1"), InputError);
  assert.throws(() => validateCredentials("analyst@example.org", "short"), InputError);
  assert.throws(() => validateCredentials("analyst@example.org", "é".repeat(37)), InputError);
});

test("passwords are stored as bcrypt hashes and can be verified", async () => {
  const password = "climate-password-1";
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
  assert.match(hash, /^\$2[aby]\$/);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("different-password", hash), false);
});

test("access tokens carry an identity and reject a different signing secret", () => {
  const token = createAccessToken(
    { _id: { toString: () => "user-123" }, tokenVersion: 0 },
    secret
  );

  assert.equal(verifyAccessToken(token, secret).sub, "user-123");
  assert.throws(() => verifyAccessToken(token, `${secret}-wrong`));
});
