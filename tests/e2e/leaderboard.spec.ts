import { expect, test } from "@playwright/test";

test("keeps leaderboard data reachable and protected across logout", async ({
  page,
}) => {
  const email = "leaderboard.e2e@example.com";
  const password = "correct horse battery staple";

  await page.goto("/register");
  await page.getByLabel("Anzeigename").fill("Leaderboard E2E");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page.getByRole("status")).toContainText("100 Credits");

  await page.getByRole("link", { name: "Jetzt anmelden" }).click();
  await expect(page).toHaveURL(/\/login$/u);
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/lobby$/u);

  await expect(page.getByRole("link", { name: "Lobby" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Dice", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Rangliste", exact: true }).click();

  await expect(page).toHaveURL(/\/leaderboard$/u);
  await expect(
    page.getByRole("heading", { level: 1, name: "Rangliste" }),
  ).toBeVisible();
  const currentRow = page.getByRole("row", { name: /Leaderboard E2E/u });
  await expect(currentRow).toContainText("100 Credits");
  await expect(currentRow).toContainText("Du");
  await expect(page.getByText(email)).toHaveCount(0);

  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page).toHaveURL(/\/login$/u);
  await page.goto("/leaderboard");
  await expect(page).toHaveURL(/\/login$/u);

  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.getByRole("link", { name: "Rangliste", exact: true }).click();

  await expect(page.getByRole("row", { name: /Leaderboard E2E/u })).toContainText(
    "100 Credits",
  );
});
