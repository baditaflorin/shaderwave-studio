import { expect, test } from "@playwright/test";

test("loads the published shell and project links", async ({ page }) => {
  await page.goto("./");

  await expect(
    page.getByRole("heading", { name: "Shaderwave Studio" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Star" })).toHaveAttribute(
    "href",
    "https://github.com/baditaflorin/shaderwave-studio",
  );
  await expect(page.getByRole("link", { name: "Support" })).toHaveAttribute(
    "href",
    "https://www.paypal.com/paypalme/florinbadita",
  );
  await expect(page.getByText("GitHub Pages, browser-only")).toBeVisible();
});
