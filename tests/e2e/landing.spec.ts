import { expect, test } from "@playwright/test";

test("serves the landing page from the production application", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Spieleabend" }),
  ).toBeVisible();
});
