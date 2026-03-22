// This file is for testing authentication feature only, will be removed when real DB auth is ready.
import { UserRecord } from "./types.js";

// Data access contract so we can swap mock storage with a real DB later.
export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: number): Promise<UserRecord | null>;
  listAll(): Promise<UserRecord[]>;
  create(input: Pick<UserRecord, "email" | "password" | "role">): Promise<UserRecord>;
}

// Temporary in-memory implementation used before real DB integration.
export function createMockUserRepository(): UserRepository {
  // Seed users required by milestone test credentials.
  const users: UserRecord[] = [
    {
      id: 1,
      email: "admin@admin.com",
      password: "111",
      role: "admin",
      apiCallsUsed: 0,
    },
    {
      id: 2,
      email: "john@john.com",
      password: "123",
      role: "user",
      apiCallsUsed: 4,
    },
  ];

  return {
    // Case-insensitive email lookup for login.
    async findByEmail(email: string) {
      return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
    },

    // Session resolution helper (token -> user id -> user record).
    async findById(id: number) {
      return users.find((user) => user.id === id) ?? null;
    },

    // Admin usage dashboard data source.
    async listAll() {
      return [...users];
    },

    // Register path with duplicate-email guard.
    async create(input) {
      const existing = users.find(
        (user) => user.email.toLowerCase() === input.email.toLowerCase()
      );

      if (existing) {
        throw new Error("EMAIL_EXISTS");
      }

      const nextId = users.length === 0 ? 1 : Math.max(...users.map((user) => user.id)) + 1;

      const created: UserRecord = {
        id: nextId,
        email: input.email,
        password: input.password,
        role: input.role,
        apiCallsUsed: 0,
      };

      users.push(created);
      return created;
    },
  };
}
