import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:3000",
    trace: "on-first-retry",
    // Screenshots en fallos
    screenshot: "only-on-failure",
  },

  projects: [
    // ── Mobile (prioritario — mobile-first) ──────────────────────────────
    {
      name: "iPhone 12 Pro",
      use: { ...devices["iPhone 12 Pro"] },
    },
    {
      name: "Pixel 5",
      use: { ...devices["Pixel 5"] },
    },
    // ── Tablet ────────────────────────────────────────────────────────────
    {
      name: "iPad Mini",
      use: { ...devices["iPad Mini"] },
    },
    // ── Desktop (secundario) ──────────────────────────────────────────────
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
