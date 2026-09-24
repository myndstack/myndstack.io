import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/**
 * The landing engine (three.js, WebGL2) is off under automation unless a test
 * opts in, so the default project runs the page in poster mode. The `engine`
 * project is the live suite: CI has no GPU, so Chromium renders WebGL through
 * SwiftShader (software) — correct pixels, but not a performance signal.
 */
const SOFTWARE_WEBGL = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // CI keeps an HTML report too: `github` alone writes nothing to upload, so a
  // red run used to leave no traces or screenshots behind.
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

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

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /e2e\/(engine|visual)\//,
    },
    {
      name: "engine",
      testMatch: /e2e\/engine\/.*\.spec\.ts$/,
      // Software WebGL is CPU-bound: one page at a time keeps timings sane.
      fullyParallel: false,
      timeout: 60_000,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        launchOptions: { args: SOFTWARE_WEBGL },
      },
    },
  ],

  webServer: {
    // Tests run against a real production build, which is where the mail
    // transport and static rendering behave as they will in deployment.
    // CI builds once in its own step and sets PW_PREBUILT; building again here
    // doubled the job's build time.
    command: process.env.PW_PREBUILT ? `PORT=${PORT} npm start` : `npm run build && PORT=${PORT} npm start`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // Lets the contact form succeed without a live provider. See lib/mail.ts.
      MAIL_TRANSPORT: "console",
      // No Turnstile keys — this suite exercises the "unconfigured deploy"
      // path deliberately. handleFormSubmission's fail-closed only fires when
      // the SITE key is set but the SECRET isn't (a partial config, which is
      // the real deploy mistake); with both unset, the client doesn't render
      // the widget and the server skips verification, matching how the
      // production build behaves without either variable.
    },
  },
});
