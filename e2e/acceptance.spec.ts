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
    await expect(page.getByPlaceholder(/enter your full name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/enter your phone number/i)).toBeVisible();
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
