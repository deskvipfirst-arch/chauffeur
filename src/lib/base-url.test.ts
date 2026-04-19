import { describe, expect, it } from "vitest";
import { getBaseUrl } from "./base-url";

describe("getBaseUrl", () => {
  it("prefers the forwarded deployment host when present", () => {
    const request = new Request("http://localhost:3000/api/checkout", {
      headers: {
        "x-forwarded-host": "vipgreeters.co.uk",
        "x-forwarded-proto": "https",
      },
    });

    expect(getBaseUrl(request, "http://localhost:3000")).toBe("https://vipgreeters.co.uk");
  });

  it("uses the non-local fallback when the request origin is local", () => {
    const request = new Request("http://localhost:3000/api/checkout");

    expect(getBaseUrl(request, "https://vipgreeters.co.uk")).toBe("https://vipgreeters.co.uk");
  });

  it("uses the request origin in normal local development", () => {
    const request = new Request("http://localhost:3000/api/checkout");

    expect(getBaseUrl(request, "http://localhost:3000")).toBe("http://localhost:3000");
  });
});
