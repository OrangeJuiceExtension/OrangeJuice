/// <reference types="vitest/config" />

import tailwindcss from '@tailwindcss/vite';
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
		homepage_url: 'https://oj-hn.com',
		description: 'Orange Juice makes Hacker News sweeter',
		browser_specific_settings: {
			gecko: {
				id: 'hello@oj-hn.com',
				// Firefox supports this, but WXT's manifest type does not include it.
				data_collection_permissions: {
					required: ['none'],
				},
			},
			// biome-ignore lint/suspicious/noExplicitAny: https://github.com/wxt-dev/wxt/pull/1976
		} as any,
		icons: {
			16: '/icon/orange_juice_icon_16x16.png',
			24: '/icon/orange_juice_icon_24x24.png',
			32: '/icon/orange_juice_icon_32x32.png',
			48: '/icon/orange_juice_icon_48x48.png',
			96: '/icon/orange_juice_icon_96x96.png',
			128: '/icon/orange_juice_icon_128x128.png',
		},
		permissions: ['history', 'storage', 'tabs'],
		host_permissions: ['https://squeeze.oj-hn.com/*'],
		web_accessible_resources: [
			{
				matches: ['https://news.ycombinator.com/*'],
				resources: ['icon/orange_juice_icon_128x128.png'],
			},
		],
	},
	vite: () => ({
		plugins: [tailwindcss()],
	}),
});
