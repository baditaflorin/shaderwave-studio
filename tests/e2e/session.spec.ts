import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("saves, resets, and restores a project state", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Demo" }).click();
  await expect(page.getByText(/shaderwave-demo\.wav/)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Save project" }).click(),
  ]);

  const statePath = await download.path();
  expect(statePath).toBeTruthy();
  const stateJson = readFileSync(statePath as string, "utf8");
  expect(stateJson).toContain('"schemaVersion":1');

  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.getByText("Load an audio file or demo")).toBeVisible();

  await page.getByLabel("Paste state JSON or link").fill(stateJson);
  await page.getByRole("button", { name: "Load pasted state" }).click();

  await expect(page.getByText(/shaderwave-demo\.wav/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Export MP4" })).toBeEnabled();
});
