import { describe, expect, it } from "vitest";
import {
  buildOperationalTestEmail,
  getOfficeNotificationRecipients,
  getTransactionalEmailConfigSummary,
  maskEmailAddress,
} from "./email";

describe("email diagnostics helpers", () => {
  it("masks email addresses for safe admin display", () => {
    expect(maskEmailAddress("office@vipgreeters.co.uk")).toBe("o•••••@vipgreeters.co.uk");
    expect(maskEmailAddress("ab@example.com")).toBe("a•@example.com");
    expect(maskEmailAddress("")).toBeNull();
  });

  it("reports missing configuration clearly", () => {
    const summary = getTransactionalEmailConfigSummary({
      apiKey: "",
      fromEmail: "",
      contactEmail: "",
      bookingNotificationEmail: "",
    });

    expect(summary.configured).toBe(false);
    expect(summary.missing).toContain("RESEND_API_KEY");
    expect(summary.missing).toContain("RESEND_FROM_EMAIL");
    expect(summary.officeDestination).toBe("d••••••••••••@gmail.com");
  });

  it("includes the business owner inbox in office notifications", () => {
    expect(getOfficeNotificationRecipients({ contactEmail: "", bookingNotificationEmail: "" })).toContain("desk.vipfirst@gmail.com");
  });

  it("supports multiple office recipients from a comma-separated list", () => {
    expect(
      getOfficeNotificationRecipients({ bookingNotificationEmail: "desk.vipfirst@gmail.com, ops@vipgreeters.co.uk" })
    ).toEqual(["desk.vipfirst@gmail.com", "ops@vipgreeters.co.uk"]);
  });

  it("builds a branded operational test email", () => {
    const message = buildOperationalTestEmail({
      initiatedBy: "admin@vipgreeters.co.uk",
      timestamp: "2026-04-18T10:30:00.000Z",
    });

    expect(message.subject).toContain("Email delivery test");
    expect(message.html).toContain("VIP Greeters");
    expect(message.html).toContain("admin@vipgreeters.co.uk");
  });
});
