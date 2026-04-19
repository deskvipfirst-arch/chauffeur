import { test, expect } from "@playwright/test";

const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const greeterEmail = process.env.E2E_GREETER_EMAIL;
const greeterPassword = process.env.E2E_GREETER_PASSWORD;

test.describe("acceptance smoke", () => {
  test("public booking page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /book now/i }).first()).toBeVisible();

    await page.goto("/booking");
    await expect(page.getByRole("heading", { name: /book your journey/i })).toBeVisible();
    await expect(page.getByPlaceholder(/enter your full name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your phone number/i)).toBeVisible();
  });

  test("booking summary is the editable journey form", async ({ page }) => {
    await page.goto("/booking");

    await expect(page.getByRole("heading", { name: /booking summary/i })).toBeVisible();
    await expect(page.getByText(/journey details/i)).toHaveCount(0);
    await expect(page.getByLabel(/service type/i).first()).toBeVisible();
    await expect(page.getByLabel(/pickup location|meet up location/i).first()).toBeVisible();
  });

  test("booking details carry into sign up", async ({ page }) => {
    const email = `booking.e2e.${Date.now()}@example.com`;
    const profileFailures: string[] = [];
    const profileWarnings: string[] = [];

    page.on("response", async (response) => {
      if (response.url().includes("/rest/v1/profiles") && response.status() >= 400) {
        profileFailures.push(`${response.status()} ${await response.text()}`);
      }
    });

    page.on("console", (message) => {
      const text = message.text();
      if (/Profile setup warning|Could not find the 'firstName' column|Could not find the 'createdAt' column/i.test(text)) {
        profileWarnings.push(text);
      }
    });

    await page.goto("/booking");
    const pickupLocationSelect = page.locator("main").getByRole("combobox").nth(2);
    await expect(pickupLocationSelect).toBeVisible();
    await page.waitForFunction(() => {
      const selects = Array.from(document.querySelectorAll("main select"));
      return selects.some((select) => Array.from((select as HTMLSelectElement).options).some((option) => option.text.includes("Heathrow Airport Terminal 2")));
    });
    await pickupLocationSelect.selectOption({ label: "Heathrow Airport Terminal 2" });
    await page.getByPlaceholder(/enter arrival flight number/i).fill("BA123");
    await page.getByPlaceholder(/enter your full name/i).fill("Jane Smith");
    await page.getByPlaceholder(/enter your email/i).fill(email);
    await page.getByPlaceholder(/enter your phone number/i).fill("07123456789");
    await page.getByRole("button", { name: /continue to booking/i }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /^sign up$/i }).click();

    await expect(page).toHaveURL(/user\/signup/);
    await expect(page.locator("#firstName")).toHaveValue("Jane");
    await expect(page.locator("#lastName")).toHaveValue("Smith");
    await expect(page.locator("#email")).toHaveValue(email);
    await expect(page.locator("#phone")).toHaveValue("07123456789");

    await page.locator("#password").fill("E2E!Booking2026");
    await page.locator("#confirmPassword").fill("E2E!Booking2026");
    await page.getByRole("button", { name: /^sign up$/i }).click();

    await expect(page).toHaveURL(/user\/signin|user\/dashboard|booking/, { timeout: 20_000 });
    if (page.url().includes("/user/signin")) {
      await expect(page.getByText(/account created|verify your email|continue/i).first()).toBeVisible();
    }

    expect(profileFailures).toEqual([]);
    expect(profileWarnings).toEqual([]);
  });

  test("user sign-in shows verification resend help", async ({ page }) => {
    await page.goto("/user/signin?message=account_created");
    await expect(page.getByText(/account created successfully/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /resend verification email/i })).toBeVisible();
  });

  test("admin sign-in page renders", async ({ page }) => {
    await page.goto("/administrator/signin");
    await expect(page.getByText(/admin sign in/i)).toBeVisible();
    await expect(page.getByPlaceholder("Email").first()).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
  });

  test("greeter dashboard is protected", async ({ page }) => {
    await page.goto("/greeter/dashboard");
    await expect(page).toHaveURL(/user\/signin|greeter\/dashboard/);
  });
});

test.describe("live credential checks", () => {
  test("admin can sign in when E2E credentials are configured", async ({ page }) => {
    test.skip(!adminEmail || !adminPassword, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run live admin acceptance.");

    await page.goto("/administrator/signin");
    await page.getByPlaceholder("Email").first().fill(adminEmail!);
    await page.getByPlaceholder("Password").fill(adminPassword!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/administrator\/dashboard/, { timeout: 20_000 });
    await expect(page.getByText(/dispatch board|admin panel|total bookings/i).first()).toBeVisible();
  });

  test("greeter can access the greeter dashboard when E2E credentials are configured", async ({ page }) => {
    test.skip(!greeterEmail || !greeterPassword, "Set E2E_GREETER_EMAIL and E2E_GREETER_PASSWORD to run live greeter acceptance.");

    await page.goto("/user/signin");
    await page.getByPlaceholder("Email").first().fill(greeterEmail!);
    await page.getByPlaceholder("Password").fill(greeterPassword!);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.goto("/greeter/dashboard");
    await expect(page).toHaveURL(/greeter\/dashboard/, { timeout: 20_000 });
    await expect(page.getByText(/greeter dashboard|assigned jobs|no assigned jobs/i).first()).toBeVisible();
  });
});
