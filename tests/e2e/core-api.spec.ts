import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

interface BrowserApiOptions {
  readonly method?: "GET" | "POST" | "DELETE";
  readonly body?: unknown;
}

interface BrowserApiResult {
  readonly status: number;
  readonly body: unknown;
  readonly bodyLength: number;
}

function browserApi(
  page: Page,
  path: string,
  options: BrowserApiOptions = {},
): Promise<BrowserApiResult> {
  return page.evaluate(
    async ({ requestPath, method, requestBody }) => {
      const hasBody = requestBody !== undefined;
      const response = await fetch(requestPath, {
        method,
        credentials: "same-origin",
        headers: hasBody ? { "content-type": "application/json" } : undefined,
        body: hasBody ? JSON.stringify(requestBody) : undefined,
      });
      const text = await response.text();
      const responseBody: unknown = text
        ? (JSON.parse(text) as unknown)
        : null;

      return {
        status: response.status,
        body: responseBody,
        bodyLength: text.length,
      };
    },
    {
      requestPath: path,
      method: options.method ?? "GET",
      requestBody: options.body,
    },
  );
}

test("serves the protected core API through the production server", async ({
  page,
}) => {
  const email = "core.api.e2e@example.com";
  const password = "correct horse battery staple";
  const requestId = randomUUID();

  await page.goto("/register");
  await page.getByLabel("Anzeigename").fill("Core API E2E");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Konto erstellen" }).click();
  await page.getByRole("link", { name: "Jetzt anmelden" }).click();
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/lobby$/u);

  const meResponse = await browserApi(page, "/api/v1/users/me");
  expect(meResponse.status).toBe(200);
  const meBody = meResponse.body;
  expect(meBody).toEqual({
    data: { displayName: "Core API E2E", credits: 100 },
  });
  expect(JSON.stringify(meBody)).not.toContain(email);

  const leaderboardResponse = await browserApi(
    page,
    "/api/v1/leaderboard",
  );
  expect(leaderboardResponse.status).toBe(200);
  expect(JSON.stringify(leaderboardResponse.body)).toContain(
    '"displayName":"Core API E2E"',
  );

  const unsupportedResponse = await browserApi(
    page,
    "/api/v1/game-rounds",
    {
      method: "POST",
      body: {
        game: "ROULETTE",
        requestId: randomUUID(),
        input: { bet: 10, prediction: "red" },
      },
    },
  );
  expect(unsupportedResponse.status).toBe(422);

  const createResponse = await browserApi(
    page,
    "/api/v1/game-rounds",
    {
      method: "POST",
      body: {
        game: "DICE",
        requestId,
        input: { bet: 10, prediction: 4 },
      },
    },
  );
  expect(createResponse.status).toBe(201);
  const createBody = createResponse.body;
  expect(createBody).toEqual({
    data: {
      round: expect.objectContaining({
        game: "DICE",
        requestId,
        bet: 10,
        prediction: 4,
      }),
    },
  });

  const roundsResponse = await browserApi(page, "/api/v1/game-rounds");
  expect(roundsResponse.status).toBe(200);
  const roundsBody = roundsResponse.body;
  expect(roundsBody).toEqual({
    data: {
      rounds: [
        expect.objectContaining({ game: "DICE", requestId }),
      ],
    },
  });

  const deleteResponse = await browserApi(
    page,
    "/api/v1/sessions/current",
    { method: "DELETE" },
  );
  expect(deleteResponse.status).toBe(204);
  expect(deleteResponse.bodyLength).toBe(0);

  const protectedAfterLogout = await browserApi(page, "/api/v1/users/me");
  expect(protectedAfterLogout.status).toBe(401);
  const repeatedDelete = await browserApi(
    page,
    "/api/v1/sessions/current",
    { method: "DELETE" },
  );
  expect(repeatedDelete.status).toBe(401);

  const notFoundResponse = await browserApi(
    page,
    "/api/v1/not-a-resource",
  );
  expect(notFoundResponse.status).toBe(404);
  expect(notFoundResponse.body).toMatchObject({
    type: "about:blank",
    code: "RESOURCE_NOT_FOUND",
  });
});
