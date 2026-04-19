import { describe, expect, it } from "vitest";
import { sanitizeMutationPayload } from "./supabase-db";

describe("supabase mutation compatibility", () => {
  it("drops legacy camel-case timestamp fields that can break PostgREST schema checks", () => {
    const payload = sanitizeMutationPayload({
      firstName: "Jane",
      lastName: "Smith",
      createdAt: "2026-04-19T10:00:00.000Z",
      updatedAt: "2026-04-19T10:00:00.000Z",
    });

    expect(payload).toEqual({
      firstName: "Jane",
      lastName: "Smith",
    });
  });
});
