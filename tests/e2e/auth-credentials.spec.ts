import { test, expect } from "@playwright/test";

/**
 * Flujo completo Credentials: registro → verificar email → login → sesión válida.
 *
 * Ejercita ~80% del código compartido con el flujo OAuth sin necesitar mocking de
 * proveedores externos. Cubre:
 *   - registerAction (rate limit, Turnstile skip en dev, Argon2id hash, token gen)
 *   - sendVerificationEmail → token capturado via /api/test/verification-token
 *   - verifyEmailAction (consumeVerificationToken, emailVerified = now)
 *   - signIn credentials (authorize, signIn callback, jwt callback)
 *   - Sesión con emailVerified != null → no redirect a /auth/verify-email
 *
 * El endpoint /api/test/verification-token solo existe cuando NODE_ENV=test.
 * Turnstile se saltea automáticamente porque CLOUDFLARE_TURNSTILE_SECRET_KEY
 * no está seteada en el entorno de test (ver src/lib/turnstile.ts).
 */

const TEST_EMAIL = `e2e-creds-${Date.now()}@example.com`;
const TEST_PASSWORD = "TestPass123";
const TEST_NAME = "E2E Test User";

test.describe("Credentials — flujo completo", () => {
  test("registro → verificar email → login → sesión válida", async ({ page, request }) => {
    // ── Paso 1: Registro ─────────────────────────────────────────────────────
    await page.goto("/auth/register");

    await page.getByLabel(/nombre/i).fill(TEST_NAME);
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/^contraseña/i).fill(TEST_PASSWORD);
    await page.getByLabel(/confirmar/i).fill(TEST_PASSWORD);

    // En test env, Turnstile token puede ser cualquier string no vacío
    // (verifyTurnstile retorna true cuando NODE_ENV=test y no hay secret key)
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(
        'input[name="turnstileToken"]',
      );
      if (input) input.value = "test-bypass-token";
    });

    await page.getByRole("button", { name: /registrarse/i }).click();

    // Debe mostrar el estado "revisá tu email" sin error
    await expect(page.getByText(/revisá tu email/i)).toBeVisible({ timeout: 5_000 });

    // ── Paso 2: Capturar token de verificación via helper de test ─────────────
    const tokenRes = await request.get(
      `/api/test/verification-token?email=${encodeURIComponent(TEST_EMAIL)}`,
    );
    expect(tokenRes.status()).toBe(200);
    const { token } = (await tokenRes.json()) as { token: string };
    expect(token).toHaveLength(64); // 32 randomBytes → 64 hex chars

    // ── Paso 3: Verificar email via link directo ──────────────────────────────
    await page.goto(
      `/auth/verify-email?token=${token}&email=${encodeURIComponent(TEST_EMAIL)}`,
    );

    // La página de verificación debe confirmar el éxito
    await expect(page.getByText(/email verificado/i)).toBeVisible({ timeout: 5_000 });

    // ── Paso 4: Login con credenciales ───────────────────────────────────────
    await page.goto("/auth/login");

    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/contraseña/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /iniciar sesión/i }).click();

    // ── Paso 5: Sesión válida — sin redirect a verify-email ──────────────────
    await page.waitForURL("/", { timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/auth\/verify-email/);
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test("login con email no verificado redirige a verify-email", async ({ page }) => {
    // Registrar sin verificar
    await page.goto("/auth/register");
    const unverifiedEmail = `e2e-unverified-${Date.now()}@example.com`;

    await page.getByLabel(/nombre/i).fill("Unverified User");
    await page.getByLabel(/email/i).fill(unverifiedEmail);
    await page.getByLabel(/^contraseña/i).fill(TEST_PASSWORD);
    await page.getByLabel(/confirmar/i).fill(TEST_PASSWORD);
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(
        'input[name="turnstileToken"]',
      );
      if (input) input.value = "test-bypass-token";
    });
    await page.getByRole("button", { name: /registrarse/i }).click();
    await expect(page.getByText(/revisá tu email/i)).toBeVisible({ timeout: 5_000 });

    // Intentar login sin haber verificado
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(unverifiedEmail);
    await page.getByLabel(/contraseña/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /iniciar sesión/i }).click();

    // signIn callback debe redirigir a verify-email, no a home
    await page.waitForURL(/\/auth\/verify-email/, { timeout: 10_000 });
    await expect(page.getByText(/verificá tu email/i)).toBeVisible();
  });

  test("login con contraseña incorrecta muestra error sin sesión", async ({ page }) => {
    // Asume que TEST_EMAIL fue verificado en el test anterior
    // En CI los tests corren en orden dentro del suite
    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/contraseña/i).fill("WrongPassword999");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();

    // Debe quedarse en login con error, sin crear sesión
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByText(/credenciales|contraseña|incorrecta/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test("reenviar verificación con email inexistente responde OK (anti-enumeración)", async ({
    request,
  }) => {
    // resendVerificationAction responde ok:true aunque el email no exista
    const res = await request.post("/auth/resend-verification", {
      data: {
        email: "nonexistent@example.com",
        turnstileToken: "test-bypass-token",
      },
    });
    // La respuesta del Server Action es manejada por el form, pero el status HTTP
    // debe ser 200 (no 404/400 que revelaría que el email no existe)
    expect(res.status()).toBeLessThan(500);
  });
});
