import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

// https://github.com/wxt-dev/examples/blob/main/examples/vitest-unit-testing/vitest.config.ts

export default defineConfig({
	plugins: [WxtVitest()],
	test: {
		environment: 'happy-dom',
		exclude: ['**/node_modules/**', '**/e2e/**'],
		globals: true,
		mockReset: true,
		restoreMocks: true,
		setupFiles: ['./src/test/vitest.setup.ts'],
	},
});
