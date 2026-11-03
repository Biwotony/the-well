import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("public story discovery opens an episode and returns home", async ({ page }) => {
  await expect(page.getByTestId("home-screen")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Learning to Stay" })).toBeVisible();

  await page.getByRole("button", { name: /Read their story/i }).click();
  await expect(page.getByTestId("story-reader")).toBeVisible();
  await expect(page.getByRole("heading", { name: "The argument beneath the argument" })).toBeVisible();

  await page.getByRole("button", { name: "Go back" }).click();
  await expect(page.getByTestId("home-screen")).toBeVisible();
});

test("journey practice completion changes the visible state", async ({ page }) => {
  await page.getByRole("button", { name: "Journey" }).click();
  await expect(page.getByTestId("journey-screen")).toBeVisible();
  await page.getByRole("button", { name: "Mark today complete" }).click();
  await expect(page.getByRole("button", { name: /Completed · \+20 points/ })).toBeVisible();
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
