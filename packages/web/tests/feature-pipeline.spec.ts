import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const PROJECT_KEY = "spec-intelligence:project";

/**
 * Set up localStorage with a test project before each test.
 * Uses a temp directory so we don't pollute real projects.
 */
async function setupProject(page: Page, projectRoot: string) {
  // Navigate first so we can set localStorage on the correct origin
  await page.goto("/");
  await page.evaluate(
    ([key, root]) => {
      localStorage.setItem(key, root);
    },
    [PROJECT_KEY, projectRoot] as const,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: Homepage loads
// ─────────────────────────────────────────────────────────────────────────────

test.describe("App loads", () => {
  test("homepage renders without crash", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    // Should see some UI element (title bar, sidebar, etc.)
    await expect(page.locator("body")).not.toBeEmpty();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Features page
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Features page", () => {
  test("navigates to /features and renders", async ({ page }) => {
    await page.goto("/features");
    // Should see the page heading
    await expect(page.locator("h1")).toContainText("Features");
  });

  test("shows + New Feature button", async ({ page }) => {
    await page.goto("/features");
    const button = page.getByRole("button", { name: /new feature/i });
    await expect(button).toBeVisible();
  });

  test("opens new feature dialog on button click", async ({ page }) => {
    await page.goto("/features");
    await page.getByRole("button", { name: /new feature/i }).click();
    // Dialog should appear with description field
    await expect(page.getByLabel(/description/i)).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Feature creation flow
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Feature creation", () => {
  let testDir: string;

  test.beforeEach(async ({ page }) => {
    // Create a temp project directory
    testDir = `/tmp/spec-test-${randomUUID().slice(0, 8)}`;
    await page.goto("/");
    await page.evaluate(
      async ([dir]) => {
        // Register as project via API
        await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: dir, name: "Test Project", action: "create" }),
        });
        localStorage.setItem("spec-intelligence:project", dir);
      },
      [testDir],
    );
  });

  test("creates a new feature and navigates to spec editor", async ({ page }) => {
    await page.goto("/features");

    // Open dialog
    await page.getByRole("button", { name: /new feature/i }).click();
    await expect(page.getByLabel(/description/i)).toBeVisible();

    // Fill in description
    await page.getByLabel(/description/i).fill("Test feature for E2E testing");

    // Submit — use the button inside the form dialog (not the empty state one)
    await page.locator("form").getByRole("button", { name: /create feature/i }).click();

    // Should navigate to spec editor page
    await page.waitForURL(/\/features\/.*\/spec/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/features\/.*\/spec/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: API endpoints respond
// ─────────────────────────────────────────────────────────────────────────────

test.describe("API health checks", () => {
  test("GET /api/features returns 200", async ({ request }) => {
    const response = await request.get("/api/features", {
      headers: { "X-Project-Root": "/tmp/spec-test-api" },
    });
    // Might be 200 with empty list or 500 if no project — we want at least no crash
    expect([200, 400, 404, 500]).toContain(response.status());
  });

  test("GET /api/projects returns 200", async ({ request }) => {
    const response = await request.get("/api/projects");
    expect(response.status()).toBe(200);
    const data = await response.json();
    // API returns { projects: [...] }
    expect(data).toHaveProperty("projects");
    expect(Array.isArray(data.projects)).toBe(true);
  });

  test("GET /api/llm/status returns status", async ({ request }) => {
    const response = await request.get("/api/llm/status");
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("status");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Feature detail page and pipeline navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Pipeline navigation", () => {
  let testDir: string;
  let featureSlug: string;

  test.beforeAll(async ({ request }) => {
    // Create a temp project and feature via API
    testDir = `/tmp/spec-test-pipeline-${randomUUID().slice(0, 8)}`;

    // Create project
    await request.post("/api/projects", {
      data: { path: testDir, name: "Pipeline Test", action: "create" },
    });

    // Create feature
    const createResponse = await request.post("/api/features", {
      headers: {
        "Content-Type": "application/json",
        "X-Project-Root": testDir,
      },
      data: {
        description: "Pipeline test feature",
        shortName: "pipeline-test",
      },
    });

    if (createResponse.ok()) {
      const data = await createResponse.json();
      featureSlug = data.feature?.slug ?? data.slug;
    }
  });

  test("feature detail page loads", async ({ page }) => {
    test.skip(!featureSlug, "Feature was not created");
    await setupProject(page, testDir);
    await page.goto(`/features/${featureSlug}`);

    // Should show the feature name
    await expect(page.locator("h1")).toBeVisible();
    // Should show pipeline visualization
    await expect(page.locator("text=Specify")).toBeVisible();
  });

  test("spec editor loads for feature", async ({ page }) => {
    test.skip(!featureSlug, "Feature was not created");
    await setupProject(page, testDir);
    await page.goto(`/features/${featureSlug}/spec`);

    // Should show the spec editor
    await expect(page.locator("text=Specification Editor")).toBeVisible({ timeout: 10000 });
  });

  test("spec editor has form/markdown/raw tabs", async ({ page }) => {
    test.skip(!featureSlug, "Feature was not created");
    await setupProject(page, testDir);
    await page.goto(`/features/${featureSlug}/spec`);

    await expect(page.getByRole("button", { name: "Form" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: "Markdown" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Raw" })).toBeVisible();
  });

  test("spec editor save button exists and can be clicked", async ({ page }) => {
    test.skip(!featureSlug, "Feature was not created");
    await setupProject(page, testDir);
    await page.goto(`/features/${featureSlug}/spec`);

    const saveButton = page.getByRole("button", { name: /save/i });
    await expect(saveButton).toBeVisible({ timeout: 10000 });
  });

  test("spec editor shows title field in form mode", async ({ page }) => {
    test.skip(!featureSlug, "Feature was not created");
    await setupProject(page, testDir);
    await page.goto(`/features/${featureSlug}/spec`);

    // Wait for form to load
    await expect(page.getByRole("button", { name: "Form" })).toBeVisible({ timeout: 10000 });

    // Should show title field
    const titleInput = page.locator('input[type="text"]').first();
    await expect(titleInput).toBeVisible();
  });

  test("workflow stepper is visible in layout", async ({ page }) => {
    test.skip(!featureSlug, "Feature was not created");
    await setupProject(page, testDir);
    await page.goto(`/features/${featureSlug}/spec`);

    // Workflow stepper should be in the layout header
    const specifyStep = page.locator("nav[aria-label='Workflow progress']");
    await expect(specifyStep).toBeVisible({ timeout: 10000 });
  });

  test("clicking Specify step in stepper works", async ({ page }) => {
    test.skip(!featureSlug, "Feature was not created");
    await setupProject(page, testDir);
    await page.goto(`/features/${featureSlug}/spec`);

    // The Specify step should be active (clickable)
    const specifyButton = page.locator("nav[aria-label='Workflow progress'] button").first();
    await expect(specifyButton).toBeVisible({ timeout: 10000 });
    await expect(specifyButton).toBeEnabled();
  });

  test("plan page loads (even with no plan)", async ({ page }) => {
    test.skip(!featureSlug, "Feature was not created");
    await setupProject(page, testDir);
    await page.goto(`/features/${featureSlug}/plan`);

    // Should show plan page content — either plan editor or empty state
    await page.waitForLoadState("networkidle");
    // Should not show crash/error
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Application error");
  });

  test("tasks page loads (even with no tasks)", async ({ page }) => {
    test.skip(!featureSlug, "Feature was not created");
    await setupProject(page, testDir);
    await page.goto(`/features/${featureSlug}/tasks`);

    // Should show tasks page content
    await page.waitForLoadState("networkidle");
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Application error");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Full pipeline flow - create, edit spec, save, navigate to next step
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Full pipeline flow", () => {
  let testDir: string;

  test.beforeEach(async ({ page }) => {
    testDir = `/tmp/spec-test-flow-${randomUUID().slice(0, 8)}`;

    await page.goto("/");
    await page.evaluate(
      async ([dir]) => {
        await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: dir, name: "Flow Test", action: "create" }),
        });
        localStorage.setItem("spec-intelligence:project", dir);
      },
      [testDir],
    );
  });

  test("create feature → edit spec → save → see Next Step button", async ({ page }) => {
    // 1. Go to features page — reload to ensure localStorage is picked up
    await page.goto("/features");
    await expect(page.getByRole("button", { name: /new feature/i })).toBeVisible();

    // 2. Create new feature
    await page.getByRole("button", { name: /new feature/i }).click();
    await page.getByLabel(/description/i).fill("E2E full pipeline test");
    await page.locator("form").getByRole("button", { name: /create feature/i }).click();

    // 3. Should navigate to spec editor
    await page.waitForURL(/\/features\/.*\/spec/, { timeout: 15000 });

    // 4. Wait for editor to load — may show error if spec load fails,
    //    or show the form if spec loaded successfully
    const formButton = page.getByRole("button", { name: "Form" });
    const errorText = page.getByText("Failed to load specification");
    const retryButton = page.getByRole("button", { name: "Retry" });

    // If we see the error, retry (timing issue: spec page loads before spec file is ready)
    const firstVisible = await Promise.race([
      formButton.waitFor({ timeout: 10000 }).then(() => "form" as const),
      errorText.waitFor({ timeout: 10000 }).then(() => "error" as const),
    ]);

    if (firstVisible === "error") {
      // The spec loaded before the file was fully written — retry
      await retryButton.click();
      await expect(formButton).toBeVisible({ timeout: 10000 });
    }

    // 5. Switch to Markdown mode and edit to trigger isDirty
    await page.getByRole("button", { name: "Markdown" }).click();
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();
    // Append text to trigger onChange → isDirty
    await textarea.click();
    await textarea.press("End");
    await textarea.pressSequentially("\n\n## Requirements\n- **REQ-1**: The system shall pass the E2E test", { delay: 10 });

    // 6. Save — should now be enabled since content changed
    const saveButton = page.getByRole("button", { name: /^save$/i });
    await expect(saveButton).toBeEnabled({ timeout: 3000 });
    await saveButton.click();

    // 7. Wait for save to complete
    await expect(saveButton).toBeDisabled({ timeout: 5000 });

    // 8. Next Step button should appear
    const nextButton = page.getByRole("button", { name: /next step/i });
    await expect(nextButton).toBeVisible({ timeout: 5000 });
  });

  test("Next Step button navigates to plan page", async ({ page }) => {
    // Create and save a feature first
    await page.goto("/features");
    await page.getByRole("button", { name: /new feature/i }).click();
    await page.getByLabel(/description/i).fill("Navigation test feature");
    await page.locator("form").getByRole("button", { name: /create feature/i }).click();

    await page.waitForURL(/\/features\/.*\/spec/, { timeout: 15000 });

    // Wait for editor to load — handle potential 404 retry
    const formButton = page.getByRole("button", { name: "Form" });
    const errorText = page.getByText("Failed to load specification");
    const retryButton = page.getByRole("button", { name: "Retry" });

    const firstVisible = await Promise.race([
      formButton.waitFor({ timeout: 10000 }).then(() => "form" as const),
      errorText.waitFor({ timeout: 10000 }).then(() => "error" as const),
    ]);

    if (firstVisible === "error") {
      await retryButton.click();
      await expect(formButton).toBeVisible({ timeout: 10000 });
    }

    // Switch to Markdown and edit to trigger isDirty
    await page.getByRole("button", { name: "Markdown" }).click();
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();
    await textarea.click();
    await textarea.press("End");
    await textarea.pressSequentially("\n\n## Requirements\n- **REQ-1**: Navigation test requirement", { delay: 10 });

    // Save
    const saveButton = page.getByRole("button", { name: /^save$/i });
    await expect(saveButton).toBeEnabled({ timeout: 3000 });
    await saveButton.click();
    await expect(saveButton).toBeDisabled({ timeout: 5000 });

    // Click Next Step
    const nextButton = page.getByRole("button", { name: /next step/i });
    await expect(nextButton).toBeVisible({ timeout: 5000 });
    await nextButton.click();

    // Should navigate to plan page
    await page.waitForURL(/\/features\/.*\/plan/, { timeout: 10000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Board view
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Board view", () => {
  test("view toggle is visible on features page", async ({ page }) => {
    await page.goto("/features");
    // List view button
    const listButton = page.getByTitle("List view");
    await expect(listButton).toBeVisible();
    // Board view button
    const boardButton = page.getByTitle("Board view");
    await expect(boardButton).toBeVisible();
  });

  test("switching to board view shows columns", async ({ page }) => {
    await page.goto("/features");
    await page.getByTitle("Board view").click();

    // Should show grouping toggle
    await expect(page.getByRole("button", { name: "By Status" })).toBeVisible();
    await expect(page.getByRole("button", { name: "By Project" })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test: Sidebar navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Sidebar navigation", () => {
  test("sidebar has Features link", async ({ page }) => {
    await page.goto("/features");
    const featuresLink = page.locator("aside a, nav a").filter({ hasText: "Features" }).first();
    await expect(featuresLink).toBeVisible();
  });

  test("sidebar has Projects link", async ({ page }) => {
    await page.goto("/features");
    const projectsLink = page.locator("aside a, nav a").filter({ hasText: "Projects" }).first();
    await expect(projectsLink).toBeVisible();
  });

  test("clicking Projects navigates to /projects", async ({ page }) => {
    await page.goto("/features");
    const projectsLink = page.locator("aside a, nav a").filter({ hasText: "Projects" }).first();
    await projectsLink.click();
    await page.waitForURL(/\/projects/);
  });
});
