import { describe, expect, it } from "vitest";
import { getBaseUrl } from "./url";

describe("getBaseUrl", () => {
  it("prefers the forwarded deployment host when present", () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.APP_BASE_URL;

    const request = new Request("http://localhost:3000/api/checkout", {
      headers: {
        "x-forwarded-host": "vipgreeters.co.uk",
        "x-forwarded-proto": "https",
      },
    });

    expect(getBaseUrl(request)).toBe("https://vipgreeters.co.uk");
  });

  it("uses the non-local fallback when the request origin is local", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://vipgreeters.co.uk";
    delete process.env.APP_BASE_URL;

    const request = new Request("http://localhost:3000/api/checkout");

    expect(getBaseUrl(request)).toBe("https://vipgreeters.co.uk");
  });

  it("uses the request origin in normal local development", () => {
    delete process.env.NEXT_PUBLIC_BASE_URL;
    delete process.env.APP_BASE_URL;

    const request = new Request("http://localhost:3000/api/checkout");

    expect(getBaseUrl(request)).toBe("http://localhost:3000");
  });
});
