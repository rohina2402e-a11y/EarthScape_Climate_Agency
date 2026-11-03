import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requirePasswordUpdated } from "../../middleware/auth.js";
import { Observation } from "./observation.model.js";

export default function observationRoutes({ jwtSecret }) {
  const router = Router();

  router.use(requireAuth({ jwtSecret }), requirePasswordUpdated);

  router.get("/", async (_request, response, next) => {
    try {
      const observations = await Observation.find().sort({ observedAt: -1 }).limit(100).lean();
      response.json({ observations });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    try {
      const observation = await Observation.create(request.body);
      response.status(201).json({ observation });
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
        return response.status(400).json({ error: error.message });
      }

      next(error);
    }
  });

  return router;
}
