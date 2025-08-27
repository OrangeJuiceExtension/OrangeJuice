import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing';

// https://github.com/wxt-dev/examples/blob/main/examples/vitest-unit-testing/vitest.config.ts

export default defineConfig({
	// Configure test behavior however you like
	test: {
		mockReset: true,
		restoreMocks: true,
	},

	// This is the line that matters!
	plugins: [WxtVitest()],
});
