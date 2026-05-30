/**
 * Playwright globalSetup for screenshot tests.
 *
 * 1. Seeds DB with stable test users.
 * 2. Logs in each user via the UI and saves storage state to .playwright/states/.
 *    Tests import these states via test.use({ storageState }) per describe-block.
 */
import { chromium } from "@playwright/test";
import { runSeed, SS_PASSWORD } from "./seed";
import { mkdir } from "fs/promises";
import path from "path";

const BASE_URL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:3000";
const STATES_DIR = path.join(process.cwd(), ".playwright", "states");

async function loginAndSave(
  email: string,
  stateFile: string,
): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/auth/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/contraseña/i).fill(SS_PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();

  // Wait for navigation away from login — could land on /onboarding or /
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), {
    timeout: 15_000,
  });

  await context.storageState({ path: stateFile });
  await browser.close();
}

export default async function globalSetup() {
  await mkdir(STATES_DIR, { recursive: true });

  console.log("[screenshots] seeding database...");
  const seed = await runSeed();
  console.log("[screenshots] seed complete");

  const users = seed.users;

  console.log("[screenshots] creating storage states...");
  await Promise.all([
    loginAndSave(users.fresh.email, path.join(STATES_DIR, "fresh.json")),
    loginAndSave(users.client.email, path.join(STATES_DIR, "client.json")),
    loginAndSave(
      users.providerNoCuil.email,
      path.join(STATES_DIR, "provider-no-cuil.json"),
    ),
    loginAndSave(
      users.providerNoZones.email,
      path.join(STATES_DIR, "provider-no-zones.json"),
    ),
    loginAndSave(
      users.providerDocsReady.email,
      path.join(STATES_DIR, "provider-docs-ready.json"),
    ),
  ]);
  console.log("[screenshots] storage states saved");
}
