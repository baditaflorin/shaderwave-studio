import { expect, test } from "@playwright/test";
import { statSync } from "node:fs";

test("exports a deterministic demo MP4 with provenance", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Demo" }).click();
  await expect(page.getByText(/shaderwave-demo\.wav/)).toBeVisible();

  await page.getByLabel("Seconds").fill("2");
  await page.getByLabel("FPS").fill("12");
  await page.getByLabel("Width").fill("480");
  await page.getByLabel("Height").fill("270");

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 120_000 }),
    page.getByRole("button", { name: "Export MP4" }).click(),
  ]);
  const path = await download.path();

  expect(path).toBeTruthy();
  expect(statSync(path as string).size).toBeGreaterThan(1000);
  await expect(
    page.getByRole("link", { name: "Download provenance" }),
  ).toBeVisible();
});
