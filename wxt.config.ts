/// <reference types="vitest/config" />

import tailwindcss from '@tailwindcss/vite';
import { defineConfig, defineWebExtConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
	manifest: ({ browser }) => ({
		browser_specific_settings: {
			gecko: {
				data_collection_permissions: {
					required: ['none'],
				},
				id: 'hello@oj-hn.com',
			},
		},
		description: 'Orange Juice makes Hacker News sweeter',
		homepage_url: 'https://oj-hn.com',
		host_permissions: ['https://news.ycombinator.com/*', 'https://squeeze.oj-hn.com/*'],
		icons: {
			16: '/icon/orange_juice_icon_16x16.png',
			24: '/icon/orange_juice_icon_24x24.png',
			32: '/icon/orange_juice_icon_32x32.png',
			48: '/icon/orange_juice_icon_48x48.png',
			96: '/icon/orange_juice_icon_96x96.png',
			128: '/icon/orange_juice_icon_128x128.png',
		},
		name: 'Orange Juice',
		permissions:
			browser === 'safari'
				? ['nativeMessaging', 'storage', 'tabs']
				: ['history', 'storage', 'tabs'],
		web_accessible_resources: [
			{
				matches: ['https://news.ycombinator.com/*'],
				resources: [
					'following.html',
					'icon/follow-check.svg',
					'icon/follow-plus.svg',
					'icon/refresh.svg',
					'icon/orange_juice_icon_128x128.png',
				],
			},
		],
	}),
	modules: ['@wxt-dev/module-react'],
	srcDir: 'src',
	vite: () => ({
		plugins: [tailwindcss()],
	}),
	webExt: defineWebExtConfig({
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
		openConsole: true,
		openDevtools: true,
		startUrls: ['https://news.ycombinator.com/'],
	}),
});
