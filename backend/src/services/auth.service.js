import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_BCRYPT_PASSWORD_BYTES = 72;

export class InputError extends Error {}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export function validateCredentials(email, password) {
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254) {
    throw new InputError("Enter a valid email address.");
  }

  if (
    typeof password !== "string" ||
    password.length < MIN_PASSWORD_LENGTH ||
    Buffer.byteLength(password, "utf8") > MAX_BCRYPT_PASSWORD_BYTES
  ) {
    throw new InputError("Password must be at least 12 characters and no more than 72 bytes.");
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createAccessToken(user, secret) {
  return jwt.sign(
    { tokenVersion: user.tokenVersion },
    secret,
    {
      subject: user._id.toString(),
      issuer: "earthscape-climate-agency",
      audience: "earthscape-api",
      expiresIn: "1h"
    }
  );
}

export function verifyAccessToken(token, secret) {
  const payload = jwt.verify(token, secret, {
    issuer: "earthscape-climate-agency",
    audience: "earthscape-api"
  });

  if (typeof payload === "string" || typeof payload.sub !== "string" || !Number.isInteger(payload.tokenVersion)) {
    throw new jwt.JsonWebTokenError("Invalid token claims.");
  }

  return payload;
}
