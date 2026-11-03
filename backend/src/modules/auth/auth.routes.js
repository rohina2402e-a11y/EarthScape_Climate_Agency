import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  createAccessToken,
  hashPassword,
  InputError,
  normalizeEmail,
  validateCredentials,
  verifyPassword
} from "../../services/auth.service.js";
import { publicUser, User } from "../users/user.model.js";

export default function authRoutes({ jwtSecret }) {
  const router = Router();
  const authenticate = requireAuth({ jwtSecret });

  router.post("/login", async (request, response, next) => {
    const { email, password } = request.body ?? {};

    if (typeof email !== "string" || typeof password !== "string") {
      return response.status(400).json({ error: "Email and password are required." });
    }
    if (Buffer.byteLength(password, "utf8") > 72) {
      return response.status(400).json({ error: "Password must not exceed 72 bytes." });
    }

    try {
      const user = await User.findOne({ email: normalizeEmail(email), active: true }).select("+password");
      if (!user || !(await verifyPassword(password, user.password))) {
        return response.status(401).json({ error: "Email or password is incorrect." });
      }

      return response.json({
        token: createAccessToken(user, jwtSecret),
        user: publicUser(user)
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/me", authenticate, (request, response) => {
    response.json({ user: publicUser(request.user) });
  });

  router.post("/change-password", authenticate, async (request, response, next) => {
    const { currentPassword, newPassword } = request.body ?? {};
    if (typeof currentPassword !== "string") {
      return response.status(400).json({ error: "Current password is required." });
    }

    try {
      validateCredentials(request.user.email, newPassword);
    } catch (error) {
      if (error instanceof InputError) {
        return response.status(400).json({ error: error.message });
      }
      return next(error);
    }

    try {
      const user = await User.findById(request.user._id).select("+password");
      if (!user || !(await verifyPassword(currentPassword, user.password))) {
        return response.status(401).json({ error: "Current password is incorrect." });
      }

      user.password = await hashPassword(newPassword);
      user.tokenVersion += 1;
      user.passwordChangeRequired = false;
      await user.save();

      return response.json({ message: "Password changed. Please sign in again." });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
