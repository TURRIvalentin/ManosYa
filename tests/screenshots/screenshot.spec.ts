/**
 * Screenshot capture suite for Fase 1 UI states.
 *
 * Output: docs/screenshots/fase-1/{slug}-{project}.png
 *
 * Run: pnpm test:screenshots
 *
 * Covered states (8 required + extras):
 *  1. /auth/register             mobile + desktop
 *  2. /auth/verify-email         idle (email sent)
 *  3. /auth/verify-email         success (valid token)
 *  4. /auth/verify-email         error (invalid token)
 *  5. /onboarding/tipo-cuenta    step 1 (client user)
 *  6. /onboarding/cuil           step 3 with CUIL typed (provider, step 3/6)
 *  7. /onboarding/documentos     step 6 with file preview (provider, step 6/6)
 *  8. /auth/register             duplicate email error
 *  9. /auth/login                both providers visible
 * 10. /onboarding/zonas          step 4/6 (resumed mid-flow)
 */
import { test, expect, type Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const OUT_DIR = path.join(process.cwd(), "docs", "screenshots", "fase-1");
const STATES_DIR = path.join(process.cwd(), ".playwright", "states");

test.beforeAll(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

function shot(page: Page, slug: string, projectName: string) {
  return page.screenshot({
    path: path.join(OUT_DIR, `${slug}-${projectName}.png`),
    fullPage: false,
  });
}

// ─── Unauthenticated screens ──────────────────────────────────────────────────

test.describe("Auth — register", () => {
  test("register page", async ({ page }, testInfo) => {
    await page.goto("/auth/register");
    await page.waitForLoadState("networkidle");
    await shot(page, "register", testInfo.project.name);
  });

  test("register — duplicate email error", async ({ page }, testInfo) => {
    await page.goto("/auth/register");

    await page.getByLabel(/nombre/i).fill("SS Existing");
    await page.getByLabel(/email/i).fill("ss-existing@manosya.test");
    await page.getByLabel(/^contraseña/i).fill("Test1234!");
    await page.getByLabel(/confirmar/i).fill("Test1234!");

    // Bypass Turnstile (not present in dev / test env without secret key)
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(
        'input[name="turnstileToken"]',
      );
      if (input) input.value = "test-bypass-token";
    });

    await page.getByRole("button", { name: /registrarse/i }).click();
    // Wait for the error state to appear
    await expect(
      page.getByText(/ya existe|registrado|en uso/i),
    ).toBeVisible({ timeout: 8_000 });

    await shot(page, "register-email-duplicado", testInfo.project.name);
  });
});

test.describe("Auth — login", () => {
  test("login page (both providers visible)", async ({ page }, testInfo) => {
    await page.goto("/auth/login");
    await page.waitForLoadState("networkidle");
    await shot(page, "login", testInfo.project.name);
  });
});

test.describe("Auth — verify-email", () => {
  test("verify-email idle (email sent, waiting)", async ({ page }, testInfo) => {
    await page.goto(
      `/auth/verify-email?unverified=${encodeURIComponent("ss-unverified@manosya.test")}`,
    );
    await page.waitForLoadState("networkidle");
    await shot(page, "verify-email-idle", testInfo.project.name);
  });

  test("verify-email success (valid token)", async ({ page }, testInfo) => {
    const seedPath = path.join(process.cwd(), ".playwright", "screenshot-seed.json");
    const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8")) as {
      users: { unverified: { email: string; verificationToken: string } };
    };
    const { email, verificationToken } = seed.users.unverified;

    await page.goto(
      `/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`,
    );
    await expect(page.getByText(/verificado|verificación exitosa/i)).toBeVisible({
      timeout: 8_000,
    });
    await shot(page, "verify-email-success", testInfo.project.name);
  });

  test("verify-email error (invalid token)", async ({ page }, testInfo) => {
    await page.goto(
      `/auth/verify-email?token=invalidtoken000000000000000000000000000000000000000000000000000000&email=${encodeURIComponent("ss-unverified@manosya.test")}`,
    );
    await expect(
      page.getByText(/inválido|expirado|error/i),
    ).toBeVisible({ timeout: 8_000 });
    await shot(page, "verify-email-error", testInfo.project.name);
  });
});

// ─── Client onboarding flow ───────────────────────────────────────────────────

test.describe("Onboarding — tipo-cuenta (step 1)", () => {
  // ss-fresh has no profiles → correctStep = "tipo-cuenta" → no guard redirect
  test.use({ storageState: path.join(STATES_DIR, "fresh.json") });

  test("tipo-cuenta step", async ({ page }, testInfo) => {
    await page.goto("/onboarding/tipo-cuenta");
    await page.waitForLoadState("networkidle");
    await shot(page, "onboarding-tipo-cuenta", testInfo.project.name);
  });
});

// ─── Provider onboarding — step 3 (cuil) ─────────────────────────────────────

test.describe("Onboarding — cuil (step 3/6)", () => {
  test.use({ storageState: path.join(STATES_DIR, "provider-no-cuil.json") });

  test("cuil step with CUIL typed", async ({ page }, testInfo) => {
    await page.goto("/onboarding/cuil");
    await page.waitForLoadState("networkidle");

    // Type digits into the CUIL segmented input
    // CuilInput renders three text inputs for prefix / dni / verifier
    const inputs = page.locator('input[inputmode="numeric"]');
    await inputs.nth(0).fill("20");
    await inputs.nth(1).fill("12345678");
    await inputs.nth(2).fill("6");

    await page.getByRole("textbox", { name: /bio|descripción/i }).fill(
      "Gasista matriculado MP 12345. 15 años de experiencia en instalaciones de gas natural y GLP.",
    );

    await shot(page, "onboarding-cuil", testInfo.project.name);
  });
});

// ─── Provider onboarding — step 4 (zonas) — resumed mid-flow ─────────────────

test.describe("Onboarding — zonas (step 4/6, mid-flow resume)", () => {
  test.use({ storageState: path.join(STATES_DIR, "provider-no-zones.json") });

  test("zonas step (resumed at 4/6)", async ({ page }, testInfo) => {
    // This user has cuil but no zones → redirected to zonas automatically
    await page.goto("/onboarding");
    await page.waitForURL(/\/onboarding\/zonas/, { timeout: 10_000 });
    await page.waitForLoadState("networkidle");
    await shot(page, "onboarding-zonas-midflow", testInfo.project.name);
  });
});

// ─── Provider onboarding — step 6 (documentos) ───────────────────────────────

test.describe("Onboarding — documentos (step 6/6) with file preview", () => {
  test.use({ storageState: path.join(STATES_DIR, "provider-docs-ready.json") });

  test("documentos step with image preview", async ({ page }, testInfo) => {
    await page.goto("/onboarding/documentos");
    await page.waitForLoadState("networkidle");

    // Inject a fake File object into the DNI input so the preview renders
    // without needing a real filesystem file in CI.
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>(
        'input[type="file"][name="dni"]',
      );
      if (!input) return;
      const file = new File(["(fake)"], "dni.jpg", { type: "image/jpeg" });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    // Give React a moment to update the preview
    await page.waitForTimeout(400);
    await shot(page, "onboarding-documentos", testInfo.project.name);
  });
});
