import { expect, test } from "@playwright/test";

test("registers once and returns a safe duplicate error", async ({ page }) => {
  await page.goto("/register");

  await expect(
    page.getByRole("heading", { level: 1, name: "Konto erstellen" }),
  ).toBeVisible();

  await page.getByLabel("Anzeigename").fill("Ada E2E");
  await page.getByLabel("E-Mail-Adresse").fill("ada.e2e@example.com");
  await page
    .getByLabel("Passwort")
    .fill("correct horse battery staple");
  await page.getByRole("button", { name: "Konto erstellen" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Konto erstellt. Dein Startguthaben beträgt 100 Credits.",
  );
  await expect(page).toHaveURL(/\/register$/);

  await page.getByRole("button", { name: "Konto erstellen" }).click();

  await expect(
    page.getByRole("alert").filter({
      hasText:
        "Das Konto konnte nicht erstellt werden. Bitte versuche es erneut.",
    }),
  ).toHaveText(
    "Das Konto konnte nicht erstellt werden. Bitte versuche es erneut.",
  );
});
