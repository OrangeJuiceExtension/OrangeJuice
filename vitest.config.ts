import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing';

// https://github.com/wxt-dev/examples/blob/main/examples/vitest-unit-testing/vitest.config.ts

export default defineConfig({
	test: {
		globals: true,
		environment: 'happy-dom',
		restoreMocks: true,
		mockReset: true,
		setupFiles: ['vitest-localstorage-mock'],
		exclude: ['**/node_modules/**', '**/e2e/**'],
	},
	plugins: [WxtVitest()],
});
