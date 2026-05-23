import { test, expect } from "@playwright/test";

/**
 * Tests del flujo Google OAuth.
 *
 * Estos tests requieren mocking de los endpoints de Google porque no usamos
 * credenciales reales en CI. El mocking se implementará con MSW o nock
 * interceptando https://oauth2.googleapis.com/token y
 * https://www.googleapis.com/oauth2/v3/userinfo.
 *
 * TODO(fase-1-fin): habilitar cuando se configure MSW o nock para mockear googleapis.com
 */

test.describe("Google OAuth — primer login", () => {
  test("crea sesión válida con emailVerified != null", async ({ page }) => {
    // TODO(fase-1-fin): habilitar cuando se configure MSW o nock para mockear googleapis.com
    test.skip(true, "Requiere MSW/nock para mockear googleapis.com");

    await page.route("https://oauth2.googleapis.com/token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "fake-access-token",
          token_type: "Bearer",
          expires_in: 3600,
          id_token: "fake-id-token",
        }),
      }),
    );
    await page.route("https://www.googleapis.com/oauth2/v3/userinfo", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sub: "google|test123",
          email: "test-google@example.com",
          name: "Test Google User",
          picture: "https://example.com/avatar.jpg",
          email_verified: true,
        }),
      }),
    );

    await page.goto("/auth/login");
    await page.getByRole("button", { name: /google/i }).click();

    await page.waitForURL("/", { timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/auth\/verify-email/);
  });

  test("nuevo usuario Google es redirigido a onboarding", async ({ page }) => {
    // TODO(fase-1-fin): habilitar cuando se configure MSW o nock para mockear googleapis.com
    test.skip(true, "Requiere MSW/nock para mockear googleapis.com");

    await page.goto("/auth/login");
    await page.waitForURL(/\/(|onboarding)/, { timeout: 10_000 });
  });

  test("usuario Google con email de cuenta Credentials ve error de conflicto", async ({
    page,
  }) => {
    // TODO(fase-1-fin): habilitar cuando se configure MSW o nock para mockear googleapis.com
    test.skip(true, "Requiere MSW/nock para mockear googleapis.com");

    await page.goto("/auth/login");
    await page.getByRole("button", { name: /google/i }).click();
    await page.waitForURL(/\/auth\/error/, { timeout: 10_000 });
    await expect(page.getByText(/OAuthAccountConflict/i)).toBeVisible();
  });
});
