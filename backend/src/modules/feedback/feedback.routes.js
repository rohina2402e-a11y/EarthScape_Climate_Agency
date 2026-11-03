import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth, requirePasswordUpdated, requireRole } from "../../middleware/auth.js";
import { Feedback, publicFeedback } from "./feedback.model.js";

const categories = ["Product feedback", "Technical issue", "Data question", "Access request", "Other"];
const statuses = ["received", "in_progress", "resolved"];

export default function feedbackRoutes({ jwtSecret }) {
  const router = Router();
  router.use(requireAuth({ jwtSecret }), requirePasswordUpdated);

  router.get("/", async (request, response, next) => {
    try {
      const filter = request.user.role === "admin" ? {} : { submittedBy: request.user._id };
      const feedback = await Feedback.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("submittedBy", "email")
        .lean();
      return response.json({ feedback: feedback.map(publicFeedback) });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/", async (request, response, next) => {
    const { category, subject, message } = request.body ?? {};
    const body = request.body ?? {};
    if (Object.keys(body).some((key) => !["category", "subject", "message"].includes(key))) {
      return response.status(400).json({ error: "Only category, subject, and message may be supplied." });
    }
    if (
      !categories.includes(category) ||
      typeof subject !== "string" || !subject.trim() || subject.trim().length > 120 ||
      typeof message !== "string" || !message.trim() || message.trim().length > 2000
    ) {
      return response.status(400).json({
        error: "Provide a supported category, a subject up to 120 characters, and a message up to 2000 characters."
      });
    }

    try {
      const feedback = await Feedback.create({
        submittedBy: request.user._id,
        category,
        subject: subject.trim(),
        message: message.trim()
      });
      return response.status(201).json({ feedback: publicFeedback(feedback) });
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        return response.status(400).json({ error: error.message });
      }
      return next(error);
    }
  });

  router.put("/:id", requireRole("admin"), async (request, response, next) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Feedback ID is invalid." });
    }

    const body = request.body ?? {};
    if (Object.keys(body).some((key) => !["status", "adminNote"].includes(key))) {
      return response.status(400).json({ error: "Only status and adminNote may be updated." });
    }
    const { status, adminNote = "" } = body;
    if (!statuses.includes(status) || typeof adminNote !== "string" || adminNote.length > 1000) {
      return response.status(400).json({
        error: "Provide a valid status (received, in_progress, or resolved) and an optional adminNote up to 1000 characters."
      });
    }

    try {
      const feedback = await Feedback.findByIdAndUpdate(
        request.params.id,
        { status, adminNote: adminNote.trim() },
        { new: true, runValidators: true }
      ).populate("submittedBy", "email");
      if (!feedback) return response.status(404).json({ error: "Feedback was not found." });
      return response.json({ feedback: publicFeedback(feedback) });
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
        return response.status(400).json({ error: error.message });
      }
      return next(error);
    }
  });

  router.delete("/:id", requireRole("admin"), async (request, response, next) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: "Feedback ID is invalid." });
    }
    try {
      const feedback = await Feedback.findByIdAndDelete(request.params.id);
      if (!feedback) return response.status(404).json({ error: "Feedback was not found." });
      return response.json({ message: "Feedback deleted." });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
