import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	// Fail the build on CI if you accidentally left test.only in the source code.
	forbidOnly: !!process.env.CI,

	// Configure projects for major browsers.
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],

	// Reporter to use
	reporter: 'html',

	// Retry on CI only.
	retries: process.env.CI ? 2 : 0,
	testDir: 'src/e2e',

	use: {
		// Collect trace when retrying the failed test.
		trace: 'on-first-retry',
	},

	// Opt out of parallel tests on CI.
	workers: process.env.CI ? 1 : undefined,
});
