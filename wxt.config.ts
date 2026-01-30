/// <reference types="vitest/config" />

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, defineWebExtConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ['@wxt-dev/module-react'],
	srcDir: 'src',
	webExt: defineWebExtConfig({
		openDevtools: true,
		openConsole: true,
		startUrls: ['https://news.ycombinator.com/'],
		chromiumArgs: ['--user-data-dir=./.wxt/chrome-data', '--hide-crash-restore-bubble'],
	}),
	manifest: {
		name: 'Orange Juice',
		icons: {
			16: '/icon/orange_juice_icon_16x16.png',
			24: '/icon/orange_juice_icon_32x32.png',
			48: '/icon/orange_juice_icon_48x48.png',
			96: '/icon/orange_juice_icon_96x96.png',
			128: '/icon/orange_juice_icon_128x128.png',
		},
		permissions: ['history', 'storage'],
		host_permissions: ['https://orange-juice-worker.orangejuiceextension.workers.dev/*'],
	},
	vite: () => ({
		plugins: [react(), tailwindcss()],
	}),
});
