import { NextFunction, Request, Response } from "express";
import { SessionStore } from "./sessionStore.js";
import { UserRepository } from "./userRepository.js";
import { UserRecord, UserRole } from "./types.js";

// Extended request object populated after successful auth middleware.
type AuthedRequest = Request & {
  authUser?: UserRecord;
};

// Reads Authorization header in format: Bearer <token>
function getBearerToken(req: Request): string | null {
  const raw = req.header("authorization");
  if (!raw || !raw.startsWith("Bearer ")) {
    return null;
  }

  const token = raw.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

// Verifies bearer token and attaches current user to request.
export function requireAuth(userRepo: UserRepository, sessionStore: SessionStore) {
  return async function authMiddleware(
    req: AuthedRequest,
    res: Response,
    next: NextFunction
  ) {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: "Missing bearer token." });
      return;
    }

    const userId = sessionStore.readUserId(token);
    if (!userId) {
      res.status(401).json({ error: "Invalid session token." });
      return;
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      res.status(401).json({ error: "Session user not found." });
      return;
    }

    req.authUser = user;
    next();
  };
}

// Restricts access to a specific role (used for admin-only routes).
export function requireRole(role: UserRole) {
  return function roleMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
    if (!req.authUser) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    if (req.authUser.role !== role) {
      res.status(403).json({ error: "Forbidden." });
      return;
    }

    next();
  };
}

export type { AuthedRequest };
