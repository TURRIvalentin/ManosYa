import { test, expect } from "@playwright/test";

/**
 * Tests del flujo Google OAuth.
 *
 * Estrategia de mocking: Auth.js v5 no provee un provider de test built-in.
 * Para CI sin credenciales reales usamos route interception de Playwright para
 * interceptar el callback de Google y devolver un perfil sintético.
 *
 * TODO para activar estos tests en CI:
 *   1. Agregar variables NEXTAUTH_URL + NEXTAUTH_SECRET en el entorno de test.
 *   2. Usar page.route() para interceptar https://oauth2.googleapis.com/token
 *      y https://www.googleapis.com/oauth2/v3/userinfo devolviendo fixtures.
 *   3. O alternativamente: agregar un provider "test-credentials" activo solo
 *      cuando TEST_OAUTH_BYPASS=true que salte el flujo OAuth real.
 *
 * Por ahora los tests documentan el comportamiento esperado y están marcados
 * como skip hasta que el mocking esté configurado.
 */

const TEST_GOOGLE_USER = {
  email: "test-google@example.com",
  name: "Test Google User",
  picture: "https://example.com/avatar.jpg",
  sub: "google-oauth2|test123",
  email_verified: true,
};

test.describe("Google OAuth — primer login", () => {
  test.skip(
    !process.env.TEST_OAUTH_BYPASS,
    "Requiere TEST_OAUTH_BYPASS=true y mocking de endpoints de Google",
  );

  test("crea sesión válida con emailVerified != null", async ({ page }) => {
    // Interceptar el endpoint de token de Google para devolver un token falso
    await page.route("https://oauth2.googleapis.com/token", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "fake-access-token",
          token_type: "Bearer",
          expires_in: 3600,
          id_token: "fake-id-token",
        }),
      });
    });

    // Interceptar el endpoint de perfil de Google
    await page.route(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(TEST_GOOGLE_USER),
        });
      },
    );

    await page.goto("/auth/login");
    await page.getByRole("button", { name: /google/i }).click();

    // El callback de OAuth debería resolverse y crear sesión
    await page.waitForURL("/", { timeout: 10_000 });

    // Verificar que la sesión tiene emailVerified seteado
    // (si fuera null, el middleware o requireVerifiedEmail redirige a /auth/verify-email)
    await expect(page).not.toHaveURL(/\/auth\/verify-email/);
    await expect(page).toHaveURL("/");
  });

  test("nuevo usuario Google es redirigido a onboarding", async ({ page }) => {
    // Similar setup de mocking...
    // Después del primer login, debe haber un ClientProfile pero no onboarding completo
    await page.goto("/auth/login");
    // ... mocking igual que arriba ...

    // El events.signIn crea un ClientProfile vacío, pero hasProviderOnboarded = false
    // La home page debe redirigir a /onboarding
    await page.waitForURL(/\/(|onboarding)/, { timeout: 10_000 });
  });

  test("usuario Google con email ya registrado con contraseña ve error de conflicto", async ({
    page,
  }) => {
    // Este test requiere una cuenta preexistente con passwordHash en DB
    // Se puede seedear con prisma en beforeEach
    await page.goto("/auth/login");
    await page.getByRole("button", { name: /google/i }).click();

    await page.waitForURL(/\/auth\/error/, { timeout: 10_000 });
    await expect(page.getByText(/OAuthAccountConflict/i)).toBeVisible();
  });
});

/**
 * Test unitario del guard de emailVerified en el jwt callback.
 * Verificable sin mocking OAuth: basta con testear la lógica del callback directamente.
 * Ver: tests/unit/lib/auth-jwt-guard.test.ts (pendiente)
 */
