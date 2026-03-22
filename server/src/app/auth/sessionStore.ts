// This file is for testing authentication feature only, will be removed when real DB auth is ready.

import { randomUUID } from "node:crypto";

// Session contract to keep token management independent from route handlers.
export interface SessionStore {
  issueToken(userId: number): string;
  readUserId(token: string): number | null;
  clearToken(token: string): void;
}

// In-memory token store for development/milestone demo.
export function createInMemorySessionStore(): SessionStore {
  const sessions = new Map<string, number>();

  return {
    // Creates a unique bearer token and binds it to a user id.
    issueToken(userId: number) {
      const token = randomUUID();
      sessions.set(token, userId);
      return token;
    },

    // Resolves token to session user id.
    readUserId(token: string) {
      return sessions.get(token) ?? null;
    },

    // Deletes session token (reserved for logout path).
    clearToken(token: string) {
      sessions.delete(token);
    },
  };
}
