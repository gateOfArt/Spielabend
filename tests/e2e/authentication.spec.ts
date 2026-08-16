import { expect, test } from "@playwright/test";

test("keeps the account and credits across logout and login in one server process", async ({
  context,
  page,
}) => {
  const email = "session.e2e@example.com";
  const password = "correct horse battery staple";

  await page.goto("/register");
  await page.getByLabel("Anzeigename").fill("Session E2E");
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
  await expect(page.getByRole("heading", { name: "Lobby" })).toBeVisible();
  await expect(page.getByText("100 Credits").first()).toBeVisible();
  const [sessionCookie] = await context.cookies();
  expect(sessionCookie).toMatchObject({
    httpOnly: true,
    sameSite: "Lax",
  });

  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/lobby");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();

  await expect(page).toHaveURL(/\/lobby$/);
  await expect(page.getByText("Willkommen zurück, Session E2E.")).toBeVisible();
  await expect(page.getByText("100 Credits").first()).toBeVisible();
});

test("preserves a 128-code-point Unicode password through registration and login", async ({
  page,
}) => {
  const email = "unicode.password.e2e@example.com";
  const password = "😀".repeat(128);

  await page.goto("/register");
  await page.getByLabel("Anzeigename").fill("Unicode Password E2E");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  const registrationPassword = page.getByLabel("Passwort");
  await registrationPassword.focus();
  await page.keyboard.insertText(password);
  await expect(registrationPassword).toHaveValue(password);
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await expect(page.getByRole("status")).toContainText("100 Credits");

  await page.getByRole("link", { name: "Jetzt anmelden" }).click();
  await expect(page).toHaveURL(/\/login$/u);
  await page.getByLabel("E-Mail-Adresse").fill(email);
  const loginPassword = page.getByLabel("Passwort");
  await loginPassword.focus();
  await page.keyboard.insertText(password);
  await expect(loginPassword).toHaveValue(password);
  await page.getByRole("button", { name: "Anmelden" }).click();

  await expect(page).toHaveURL(/\/lobby$/u);
  await expect(
    page.getByText("Willkommen zurück, Unicode Password E2E."),
  ).toBeVisible();
});

test("preserves a 40-code-point Unicode display name through registration and login", async ({
  page,
}) => {
  const displayName = "😀".repeat(40);
  const email = "unicode.display-name.e2e@example.com";
  const password = "correct horse battery staple";

  await page.goto("/register");
  const displayNameInput = page.getByLabel("Anzeigename");
  await displayNameInput.focus();
  await page.keyboard.insertText(displayName);
  await expect(displayNameInput).toHaveValue(displayName);
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
  await expect(
    page.getByText(`Willkommen zurück, ${displayName}.`),
  ).toBeVisible();
});
