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
		chromiumArgs: [
			'--user-data-dir=./.wxt/chrome-data',
			// '--auto-open-devtools-for-tabs',
			'--hide-crash-restore-bubble',
			'--disable-session-crashed-bubble',
			'--disable-infobars',
			'--disable-notifications',
			'--disable-features=Translate,GlobalMediaControls,MediaRouter,OptimizationHints',
			'--disable-component-update',
			'--disable-sync',
			'--no-first-run',
			'--no-default-browser-check',
			'--metrics-recording-only',
			'--password-store=basic',
			'--use-mock-keychain',
		],
	}),
	manifest: {
		name: 'Orange Juice',
		author: { email: 'hello@oj-hn.com' },
		homepage_url: 'https://oj-hn.com',
		description: 'Orange Juice makes Hacker News sweeter',
		icons: {
			16: '/icon/orange_juice_icon_16x16.png',
			24: '/icon/orange_juice_icon_32x32.png',
			48: '/icon/orange_juice_icon_48x48.png',
			96: '/icon/orange_juice_icon_96x96.png',
			128: '/icon/orange_juice_icon_128x128.png',
		},
		permissions: ['history', 'storage', 'tabs', 'webNavigation'],
		host_permissions: ['https://squeeze.oj-hn.com/*'],
	},
	vite: () => ({
		plugins: [react(), tailwindcss()],
	}),
});
