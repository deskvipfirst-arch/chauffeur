import { describe, expect, it } from "vitest";
import { canonicalizeUserRole, isAllowedRole } from "./roles";
import { shouldDropBookingUserId } from "./supabase/admin";

describe("admin role compatibility", () => {
  it("maps legacy driver-style roles to greeter access", () => {
    expect(isAllowedRole("driver", ["greeter"])).toBe(true);
    expect(isAllowedRole("office", ["admin"])).toBe(true);
    expect(canonicalizeUserRole("heathrow_monitor")).toBe("heathrow");
    expect(isAllowedRole("airport_ops", ["heathrow"])).toBe(true);
    expect(isAllowedRole("user", ["admin"])).toBe(false);
  });

  it("detects the bookings user foreign-key violation", () => {
    expect(
      shouldDropBookingUserId({
        code: "23503",
        message: 'insert or update on table "bookings" violates foreign key constraint "bookings_user_id_fkey"',
      })
    ).toBe(true);

    expect(shouldDropBookingUserId({ code: "23503", message: "other constraint" })).toBe(false);
  });
});

