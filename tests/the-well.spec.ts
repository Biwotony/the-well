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
  await expect(page.getByTestId("story-reader").getByRole("status")).toContainText("noted for this session");
  await page.getByRole("button", { name: /Continue to Part 2/ }).click();
  await expect(page.getByRole("heading", { name: "Making room for the answer" })).toBeVisible();
  await expect(page).toHaveURL(/\/stories\/learning-to-stay\/episodes\/2\?content=demo$/);
  await expect(page.getByRole("button", { name: "I want to sit with this" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Part 1", exact: true }).click();
  await expect(page.getByRole("heading", { name: "The argument beneath the argument" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Stories" }).click();
  await expect(page.getByTestId("stories-screen")).toBeVisible();
  await page.getByRole("button", { name: /^THE WELL/ }).click();
  await expect(page.getByTestId("home-screen")).toBeVisible();
});

test("story search filters titles and summaries and recovers from no results", async ({ page }) => {
  await page.goto("/stories?content=demo");
  const search = page.getByRole("searchbox", { name: "Search published stories" });
  await search.fill("patience");
  await expect(page.getByTestId("stories-screen").getByRole("status")).toHaveText("1 published story found.");
  await expect(page.getByRole("button", { name: /Read story/ })).toHaveCount(1);
  await search.fill("no-matching-story");
  await expect(page.getByText("No matching stories", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(search).toHaveValue("");
  await expect(page.getByRole("button", { name: /Read story/ })).toHaveCount(2);
});

test("completion belongs to its challenge, survives navigation and resets on reload", async ({ page }) => {
  await page.goto("/challenges/return-with-gentleness?content=demo");
  await page.getByRole("button", { name: /Complete practice/ }).click();
  await expect(page.getByRole("button", { name: "Done for this session" })).toBeVisible();
  await page.getByRole("button", { name: /^THE WELL/ }).click();
  await page.getByRole("button", { name: "Begin this practice" }).click();
  await expect(page.getByRole("button", { name: /Complete practice/ })).toBeVisible();
  await page.getByRole("button", { name: /Complete practice/ }).click();
  await page.getByRole("button", { name: "Done for this session" }).click();
  await expect(page.getByRole("button", { name: "Completed for this session" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Mark complete/ })).toBeVisible();
});

test("episode deep links reload and an unpublished episode has a recovery action", async ({ page }) => {
  await page.goto("/stories/learning-to-stay/episodes/2?content=demo");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Making room for the answer" })).toBeVisible();
  await page.goto("/stories/learning-to-stay/episodes/99?content=demo");
  await expect(page.getByRole("heading", { name: "This episode is not published." })).toBeVisible();
  await page.getByRole("button", { name: "Return to stories" }).click();
  await expect(page.getByTestId("stories-screen")).toBeVisible();
});

test("series overview lists published episodes and opens the selected part", async ({ page }) => {
  await page.goto("/stories/learning-to-stay/episodes/1?content=demo");
  await page.getByText("Learning to Stay · 2 published parts", { exact: true }).click();
  const overview = page.locator(".web-series-index");
  await expect(overview.getByRole("button", { name: /Part 1/ })).toHaveAttribute("aria-current", "page");
  await overview.getByRole("button", { name: /Part 2 Making room for the answer/ }).click();
  await expect(page.getByRole("heading", { name: "Making room for the answer" })).toBeVisible();
});

for (const width of [375, 430, 768, 1024, 1280, 1440, 1920]) {
  test(`demo public flows reflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/stories", "/stories/learning-to-stay/episodes/1", "/journeys/a-more-generous-listening", "/challenges/listen-before-answering"]) {
      await page.goto(`${path}?content=demo`);
      await expect(page.getByRole("main")).toBeVisible();
      const layout = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      expect(layout.scroll, path).toBe(layout.client);
    }
  });
}

test("journey practice completion changes the visible state", async ({ page }) => {
  await page.goto("/?content=demo");
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Journeys", exact: true }).click();
  await expect(page.getByTestId("journey-screen")).toBeVisible();
  await page.getByRole("button", { name: /A More Generous Listening/ }).click();
  await expect(page).toHaveURL(/\/journeys\/a-more-generous-listening\?content=demo$/);
  await page.getByRole("button", { name: /Mark complete/ }).click();
  await expect(page.getByRole("button", { name: /Completed for this session/ })).toBeVisible();
});

test("editorial studio requires an authorized session and remains protected after reload", async ({ page }) => {
  await page.goto("/studio?content=demo");
  await expect(page.getByTestId("studio-screen")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Editorial access is protected." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in as an editor" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Review and approve/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Editorial access is protected." })).toBeVisible();
});

test("Magic Link form is usable in preview mode without leaking a secret", async ({ page }) => {
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Email address").fill("reader@example.com");
  await page.getByRole("button", { name: "Email my Magic Link" }).click();
  await expect(page.getByRole("status")).toContainText("Demo mode");
  await expect(page.getByText(/Preview mode: add the environment values/i)).toBeVisible();
  await expect(page.getByRole("dialog")).not.toContainText("service_role");
});

test("expired Magic Links show a recoverable state without exposing provider details", async ({ page }) => {
  await page.goto("/studio?error=access_denied&error_code=otp_expired");
  await expect(page.getByText("That sign-in link has expired or was already used.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in as an editor" })).toBeVisible();
});

test("story submission is honestly disabled for the lean pilot", async ({ page }) => {
  await page.goto("/share?content=demo");
  await expect(page.getByTestId("submission-unavailable")).toBeVisible();
  await expect(page.getByRole("heading", { name: "The private submission channel is not open yet." })).toBeVisible();
  await expect(page.getByText("This pilot does not collect or store story text.")).toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(0);
});
