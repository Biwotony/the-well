import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("responsive website is the default and the device simulator remains opt-in", async ({ page }) => {
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await expect(page.getByTestId("phone-frame")).toHaveCount(0);

  await page.goto("/?preview=device");
  await expect(page.getByTestId("phone-frame")).toBeVisible();
  await expect(page.getByTestId("device-screen")).toBeVisible();
});

test("production mode never substitutes fixture content", async ({ page }) => {
  await expect(page.getByTestId("public-content-state").first()).toBeVisible();
  await expect(page.getByText("Local demonstration content")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Learning to Stay" })).toHaveCount(0);
});

test("mobile navigation opens without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("button", { name: "Stories" }).click();
  await expect(page.getByTestId("stories-screen")).toBeVisible();

  const layout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBe(layout.clientWidth);
});

for (const width of [375, 430, 768, 1024, 1280, 1440, 1920]) {
  test(`homepage has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.scrollWidth).toBe(layout.clientWidth);
  });
}

test("public story discovery opens an episode and returns home", async ({ page }) => {
  await page.goto("/?content=demo");
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await expect(page.getByText(/Local demonstration content/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Learning to Stay" })).toBeVisible();

  await page.getByRole("button", { name: /Read this story/i }).first().click();
  await expect(page.getByTestId("story-reader")).toBeVisible();
  await expect(page.getByRole("heading", { name: "The argument beneath the argument" })).toBeVisible();
  await expect(page).toHaveURL(/\/stories\/learning-to-stay\/episodes\/1\?content=demo$/);

  await page.getByRole("button", { name: "I want to sit with this" }).click();
  await expect(page.getByRole("status")).toContainText("noted for this session");
  await page.getByRole("button", { name: /Continue to Part 2/ }).click();
  await expect(page.getByRole("heading", { name: "Making room for the answer" })).toBeVisible();
  await expect(page).toHaveURL(/\/stories\/learning-to-stay\/episodes\/2\?content=demo$/);
});

test("journey practice completion changes the visible state", async ({ page }) => {
  await page.goto("/?content=demo");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Journeys", exact: true }).click();
  await expect(page.getByTestId("journey-screen")).toBeVisible();
  await page.getByRole("button", { name: /A More Generous Listening/ }).click();
  await expect(page).toHaveURL(/\/journeys\/a-more-generous-listening\?content=demo$/);
  await page.getByRole("button", { name: /Mark complete/ }).click();
  await expect(page.getByRole("button", { name: /Completed for this session/ })).toBeVisible();
});

test("editorial content remains behind an explicit approval sheet", async ({ page }) => {
  await page.getByRole("button", { name: "Studio" }).click();
  await expect(page.getByTestId("studio-screen")).toBeVisible();
  await page.getByRole("button", { name: /Review and approve/ }).click();
  await expect(page.getByText("Approve public release?")).toBeVisible();
  await page.getByRole("button", { name: "Approve and publish" }).click();
  await expect(page.getByRole("button", { name: /Published safely/ })).toBeVisible();
});

test("Magic Link form is usable in preview mode without leaking a secret", async ({ page }) => {
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Email address").fill("reader@example.com");
  await page.getByRole("button", { name: "Email my Magic Link" }).click();
  await expect(page.getByRole("status")).toContainText("Demo mode");
  await expect(page.getByText(/Preview mode: add the environment values/i)).toBeVisible();
  await expect(page.getByRole("dialog")).not.toContainText("service_role");
});
