import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase } from "../src/config/database.js";
import { hashPassword, InputError, validateCredentials } from "../src/services/auth.service.js";
import { User } from "../src/modules/users/user.model.js";

const { MONGO_URI, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD } = process.env;

if (!MONGO_URI || !BOOTSTRAP_ADMIN_EMAIL || !BOOTSTRAP_ADMIN_PASSWORD) {
  console.error("Set MONGO_URI, BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD in backend/.env first.");
  process.exit(1);
}

try {
  validateCredentials(BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD);
} catch (error) {
  if (error instanceof InputError) {
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}

try {
  await connectToDatabase(MONGO_URI);
  if (await User.exists({ role: "admin" })) {
    throw new Error("An Admin account already exists; bootstrap stopped.");
  }

  await User.create({
    email: BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase(),
    password: await hashPassword(BOOTSTRAP_ADMIN_PASSWORD),
    role: "admin",
    passwordChangeRequired: true
  });
  console.log("Initial Admin account created. Remove the bootstrap credentials from backend/.env.");
} catch (error) {
  console.error("Could not create the initial Admin account:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
