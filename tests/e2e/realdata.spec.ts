import { expect, test } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

interface FixtureExpectation {
  expected: {
    status: "loaded" | "rejected";
    profile?: string;
    warnings?: string[];
    errorCode?: string;
  };
}

const fixtureDir = resolve("test/fixtures/realdata");
const warningText: Record<string, string> = {
  long_track: "Long track",
  low_energy: "This track is nearly silent",
  partial_stream: "This looks like a partial audio file",
};
const fixtureFiles = readdirSync(fixtureDir);

for (const expectedFile of fixtureFiles
  .filter((file) => file.endsWith(".expected.json"))
  .sort()) {
  const stem = expectedFile.replace(".expected.json", "");
  const mediaFile = fixtureFiles.find(
    (file) => file.startsWith(`${stem}.`) && !file.endsWith(".json"),
  );
  if (!mediaFile) {
    throw new Error(`Missing media file for ${expectedFile}`);
  }
  const expected = JSON.parse(
    readFileSync(resolve(fixtureDir, expectedFile), "utf8"),
  ) as FixtureExpectation;

  test(`real-data fixture ${mediaFile}`, async ({ page }) => {
    await page.goto("./");

    if (expected.expected.status === "rejected") {
      await page.getByRole("button", { name: "Demo" }).click();
      await expect(page.getByText(/shaderwave-demo\.wav/)).toBeVisible();
    }

    await page
      .locator('input[type="file"]')
      .setInputFiles(resolve(fixtureDir, mediaFile));

    if (expected.expected.status === "loaded") {
      await expect(
        page.getByText(new RegExp(escapeRegExp(mediaFile))),
      ).toBeVisible({
        timeout: 45_000,
      });
      await expect(page.getByText(/Audio health/i)).toBeVisible();
      for (const warning of expected.expected.warnings ?? []) {
        await expect(
          page.getByText(warningText[warning]).first(),
        ).toBeVisible();
      }
      await expect(
        page.getByRole("button", { name: "Export MP4" }),
      ).toBeEnabled();
    } else {
      const errorText =
        expected.expected.errorCode === "empty_file"
          ? "This audio file is empty"
          : "This file is not an audio stream";
      await expect(page.getByText(errorText).first()).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText(/shaderwave-demo\.wav/)).toBeVisible();
    }
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
