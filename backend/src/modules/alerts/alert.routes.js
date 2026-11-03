import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requirePasswordUpdated, requireRole } from "../../middleware/auth.js";
import { Alert, publicAlert } from "./alert.model.js";

const fields = ["title", "description", "location", "category", "severity"];
const severities = ["low", "medium", "high", "critical"];

function validateAlertFields(body, partial = false) {
  if (Object.keys(body).some((field) => !fields.includes(field))) {
    return "Only title, description, location, category, and severity may be supplied.";
  }
  const provided = fields.filter((field) => Object.hasOwn(body, field));
  if (!provided.length || (!partial && fields.some((field) => !Object.hasOwn(body, field)))) {
    return "Provide title, description, location, category, and severity.";
  }
  if (provided.some((field) => typeof body[field] !== "string")) {
    return "Alert fields must be text.";
  }
  if (Object.hasOwn(body, "title") && (!body.title.trim() || body.title.trim().length > 160)) {
    return "Alert title is required and must be 160 characters or fewer.";
  }
  if (Object.hasOwn(body, "description") && body.description.length > 2000) {
    return "Alert description must be 2000 characters or fewer.";
  }
  if (Object.hasOwn(body, "location") && (!body.location.trim() || body.location.trim().length > 200)) {
    return "Alert location is required and must be 200 characters or fewer.";
  }
  if (Object.hasOwn(body, "category") && (!body.category.trim() || body.category.trim().length > 80)) {
    return "Alert category is required and must be 80 characters or fewer.";
  }
  if (Object.hasOwn(body, "severity") && !severities.includes(body.severity)) {
    return "Severity must be low, medium, high, or critical.";
  }
  return "";
}

export default function alertRoutes({ jwtSecret }) {
  const router = Router();
  router.use(requireAuth({ jwtSecret }), requirePasswordUpdated);

  router.get("/", async (request, response, next) => {
    try {
      const alerts = await Alert.find().sort({ createdAt: -1 }).limit(100).lean();
      return response.json({ alerts: alerts.map((alert) => publicAlert(alert, request.user._id)) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", requireRole("admin"), async (request, response, next) => {
    const validationError = validateAlertFields(request.body ?? {});
    if (validationError) return response.status(400).json({ error: validationError });

    try {
      const alert = await Alert.create({
        ...Object.fromEntries(fields.map((field) => [field, request.body[field].trim()])),
        readBy: []
      });
      return response.status(201).json({ alert: publicAlert(alert, request.user._id) });
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        return response.status(400).json({ error: error.message });
      }
      return next(error);
    }
  });

  router.put("/:id", async (request, response, next) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Alert ID is invalid." });
    }

    const body = request.body ?? {};
    const isMarkRead = Object.keys(body).length === 1 && typeof body.read === "boolean";
    if (!isMarkRead && request.user.role !== "admin") {
      return response.status(403).json({ error: "Analysts may only update their own read status." });
    }
    if (!isMarkRead) {
      const validationError = validateAlertFields(body, true);
      if (validationError) return response.status(400).json({ error: validationError });
    }

    try {
      const update = isMarkRead
        ? (body.read
          ? { $addToSet: { readBy: request.user._id } }
          : { $pull: { readBy: request.user._id } })
        : { $set: Object.fromEntries(
          fields.filter((field) => Object.hasOwn(body, field))
            .map((field) => [field, field === "severity" ? body[field] : body[field].trim()])
        ) };
      const alert = await Alert.findByIdAndUpdate(request.params.id, update, { new: true, runValidators: true });
      if (!alert) return response.status(404).json({ error: "Alert was not found." });
      return response.json({ alert: publicAlert(alert, request.user._id) });
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
        return response.status(400).json({ error: error.message });
      }
      return next(error);
    }
  });

  router.delete("/:id", requireRole("admin"), async (request, response, next) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Alert ID is invalid." });
    }
    try {
      const alert = await Alert.findByIdAndDelete(request.params.id);
      if (!alert) return response.status(404).json({ error: "Alert was not found." });
      return response.json({ message: "Alert deleted." });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
