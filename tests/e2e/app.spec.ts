import { expect, test } from "@playwright/test";

test("loads the studio and analyzes demo audio", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

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
  await page.getByRole("button", { name: "Demo" }).click();
  await expect(page.getByText(/shaderwave-demo\.wav/)).toBeVisible();
  await expect(page.getByTestId("visualizer-canvas")).toBeVisible();
  await expect(page.getByTestId("spectrogram")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export MP4" })).toBeEnabled();
  expect(consoleErrors).toEqual([]);
});
