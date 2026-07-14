import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility: zero-violation axe-core scan", () => {
  test("dashboard has no automatically detectable accessibility violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("#gateList li"); // wait for data to render before scanning
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });

  test("each tab panel is free of violations once visible", async ({ page }) => {
    await page.goto("/");
    for (const tab of ["wayfinding", "concessions", "incident"]) {
      await page.click(`.tab-btn[data-tab="${tab}"]`);
      const results = await new AxeBuilder({ page })
        .include(`#tab-${tab}`)
        .analyze();
      expect(results.violations, `${tab} tab: ${JSON.stringify(results.violations, null, 2)}`).toEqual([]);
    }
  });
});

test.describe("Keyboard navigation", () => {
  test("skip link is reachable and functional via keyboard", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.locator(".skip-link");
    await expect(skipLink).toBeFocused();
  });

  test("tabs are operable via keyboard without a mouse", async ({ page }) => {
    await page.goto("/");
    const wayfindingTab = page.locator('.tab-btn[data-tab="wayfinding"]');
    await wayfindingTab.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#tab-wayfinding")).toHaveClass(/active/);
  });

  test("incident form fields are reachable in a sensible tab order", async ({ page }) => {
    await page.goto("/");
    await page.click('.tab-btn[data-tab="incident"]');
    await page.locator("#incidentType").focus();
    await expect(page.locator("#incidentType")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#incidentLocation")).toBeFocused();
  });
});

test.describe("Core user flow smoke test", () => {
  test("volunteer can compute a route end to end", async ({ page }) => {
    await page.goto("/");
    await page.click('.tab-btn[data-tab="wayfinding"]');
    await page.selectOption("#startNode", "gate-a");
    await page.selectOption("#targetNode", "medical-1");
    await page.click('#wayfindingForm button[type="submit"]');
    await expect(page.locator("#wayResult")).toContainText("m", { timeout: 10000 });
  });
});
