import { expect, test } from "@playwright/test";

test("plays one authenticated server-authoritative Dice round", async ({
  page,
}) => {
  const email = "dice.e2e@example.com";
  const password = "correct horse battery staple";

  await page.goto("/register");
  await page.getByLabel("Anzeigename").fill("Dice E2E");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page.getByRole("status")).toContainText("100 Credits");

  await page.getByRole("link", { name: "Jetzt anmelden" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/lobby$/);

  await page.getByRole("link", { name: "Dice spielen" }).click();
  await expect(page).toHaveURL(/\/dice$/);
  await expect(page.getByRole("heading", { level: 1, name: "Dice" })).toBeVisible();

  await page.getByLabel("Einsatz in Credits").fill("10");
  await page.getByLabel("Vorhergesagte Augenzahl").selectOption("4");
  await page.getByRole("button", { name: "Würfeln" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Die Runde wurde abgerechnet.",
  );
  await expect(
    page.getByRole("heading", { name: /Treffer|Daneben/u }),
  ).toBeVisible();
  const balance = page.getByText("Aktuelles Guthaben").locator("..");
  await expect(balance).toContainText(/(?:90|150) Credits/u);
  const settledCredits = await balance.locator("strong").textContent();

  await page.reload();

  await expect(
    page.getByText("Aktuelles Guthaben").locator("..").locator("strong"),
  ).toHaveText(settledCredits ?? "");
});
