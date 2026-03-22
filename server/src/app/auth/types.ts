// Roles supported by the milestone authentication flow.
export type UserRole = "user" | "admin";

// Internal user shape (includes password; never return this directly to client).
export type UserRecord = {
  id: number;
  email: string;
  password: string;
  role: UserRole;
  apiCallsUsed: number;
};

// Safe user response shape exposed to client APIs.
export type PublicUser = {
  id: number;
  email: string;
  role: UserRole;
  apiCallsUsed: number;
};

// Helper to strip sensitive fields from internal records.
export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    apiCallsUsed: user.apiCallsUsed,
  };
}
