import { describe, expect, it } from "vitest";
import { normalizeDbRow, sanitizeMutationPayload } from "./supabase-db";

describe("supabase mutation compatibility", () => {
  it("maps camel-case fields to the lowercased Postgres columns used by the live schema", () => {
    const payload = sanitizeMutationPayload({
      firstName: "Jane",
      lastName: "Smith",
      createdAt: "2026-04-19T10:00:00.000Z",
      updatedAt: "2026-04-19T10:00:00.000Z",
      isFirstAdmin: true,
    });

    expect(payload).toEqual({
      firstname: "Jane",
      lastname: "Smith",
      createdat: "2026-04-19T10:00:00.000Z",
      updatedat: "2026-04-19T10:00:00.000Z",
      isfirstadmin: true,
    });
  });

  it("exposes camel-case aliases when reading lowercased rows back from Supabase", () => {
    const row = normalizeDbRow({
      firstname: "Jane",
      lastname: "Smith",
      createdat: "2026-04-19T10:00:00.000Z",
      isfirstadmin: true,
    });

    expect(row.firstName).toBe("Jane");
    expect(row.lastName).toBe("Smith");
    expect(row.createdAt).toBe("2026-04-19T10:00:00.000Z");
    expect(row.isFirstAdmin).toBe(true);
  });
});
