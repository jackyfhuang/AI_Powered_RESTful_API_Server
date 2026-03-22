import { Request, Response, NextFunction } from "express";
import db from "../db/schema.js";

const FREE_LIMIT = 20;

/**
 * Middleware that increments the user's API call count.
 * After 20 calls, requests still succeed but include a warning header + field.
 */
export function trackApiCall(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return next();

  const row = db
    .prepare("SELECT api_calls_used FROM users WHERE id = ?")
    .get(req.user.userId) as { api_calls_used: number } | undefined;

  if (!row) return next();

  const newCount = row.api_calls_used + 1;
  db.prepare("UPDATE users SET api_calls_used = ? WHERE id = ?").run(newCount, req.user.userId);

  if (newCount > FREE_LIMIT) {
    res.setHeader("X-Api-Limit-Warning", "Free API call limit exceeded");
    // Attach warning so route handlers can include it in the JSON body
    (req as any).apiLimitWarning = `You have used ${newCount}/${FREE_LIMIT} free API calls.`;
  }

  next();
}
