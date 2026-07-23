import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",

  /**
   * Do NOT set `reducedMotion: "reduce"` here.
   *
   * Playwright's default is no-preference, which is what these tests need. The
   * `inert` regression they exist to catch only happens on the non-reduced-motion
   * path — `Loader` returns early under reduce and never sets inert at all — so a
   * reduced-motion run would pass while the entire page was uninteractive.
   */
  use: {
    baseURL,
    trace: "on-first-retry",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    // Tests run against a real production build, which is where the mail
    // transport and static rendering behave as they will in deployment.
    command: `npm run build && PORT=${PORT} npm start`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Lets the contact form succeed without a live provider. See lib/mail.ts.
      MAIL_TRANSPORT: "console",
    },
  },
});
