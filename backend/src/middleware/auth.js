import jwt from "jsonwebtoken";
import { User } from "../modules/users/user.model.js";
import { verifyAccessToken } from "../services/auth.service.js";

export function requireAuth({ jwtSecret }) {
  return async (request, response, next) => {
    const authorization = request.get("authorization");
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);

    if (!match) {
      return response.status(401).json({ error: "Authentication is required." });
    }

    let payload;
    try {
      payload = verifyAccessToken(match[1], jwtSecret);
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        return response.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
      }

      return next(error);
    }

    try {
      const user = await User.findById(payload.sub);
      if (!user || !user.active || user.tokenVersion !== payload.tokenVersion) {
        return response.status(401).json({ error: "Your session is no longer valid. Please sign in again." });
      }

      request.user = user;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export function requireRole(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ error: "You do not have permission to perform this action." });
    }

    return next();
  };
}

export function requirePasswordUpdated(request, response, next) {
  if (request.user.passwordChangeRequired) {
    return response.status(403).json({
      error: "Change your temporary password before continuing.",
      code: "PASSWORD_CHANGE_REQUIRED"
    });
  }

  return next();
}
