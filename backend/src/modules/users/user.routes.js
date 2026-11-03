import { Router } from "express";
import { requireAuth, requirePasswordUpdated, requireRole } from "../../middleware/auth.js";
import {
  hashPassword,
  InputError,
  normalizeEmail,
  validateCredentials
} from "../../services/auth.service.js";
import { publicUser, User } from "./user.model.js";

export default function userRoutes({ jwtSecret }) {
  const router = Router();

  router.use(requireAuth({ jwtSecret }), requireRole("admin"), requirePasswordUpdated);

  router.get("/", async (_request, response, next) => {
    try {
      const users = await User.find().sort({ email: 1 }).lean();
      return response.json({ users: users.map(publicUser) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    const { email, password } = request.body ?? {};

    try {
      validateCredentials(email, password);
      const user = await User.create({
        email: normalizeEmail(email),
        password: await hashPassword(password),
        role: "analyst",
        passwordChangeRequired: true
      });
      return response.status(201).json({ user: publicUser(user) });
    } catch (error) {
      if (error instanceof InputError) {
        return response.status(400).json({ error: error.message });
      }

      if (error?.code === 11000) {
        return response.status(409).json({ error: "An account with that email already exists." });
      }

      return next(error);
    }
  });

  return router;
}
