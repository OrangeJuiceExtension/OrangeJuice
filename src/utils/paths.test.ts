import { afterEach, describe, expect, it } from 'vitest';
import { getFollowingPageUrl, paths } from '@/utils/paths.ts';

interface RuntimeGlobals {
	browser?: {
		runtime?: {
			getURL?: (path: string) => string;
		};
	};
	chrome?: {
		runtime?: {
			getURL?: (path: string) => string;
		};
	};
}

const originalBrowser = (globalThis as typeof globalThis & RuntimeGlobals).browser;
const originalChrome = (globalThis as typeof globalThis & RuntimeGlobals).chrome;

describe('paths', () => {
	afterEach(() => {
		const runtimeGlobals = globalThis as typeof globalThis & RuntimeGlobals;
		runtimeGlobals.browser = originalBrowser;
		runtimeGlobals.chrome = originalChrome;
	});

	it('exposes the Hacker News base URL', () => {
		expect(paths.base).toBe('https://news.ycombinator.com');
	});

	it('prefers browser runtime URLs, then chrome runtime URLs, then the fallback path', () => {
		const cases = [
			{
				name: 'browser runtime',
				globals: {
					browser: {
						runtime: {
							getURL: (path: string) => `moz-extension://test${path}`,
						},
					},
				},
				expected: 'moz-extension://test/following.html',
			},
			{
				name: 'chrome runtime fallback',
				globals: {
					chrome: {
						runtime: {
							getURL: (path: string) => `chrome-extension://test${path}`,
						},
					},
				},
				expected: 'chrome-extension://test/following.html',
			},
			{
				name: 'plain fallback',
				globals: {},
				expected: '/following.html',
			},
		] satisfies ReadonlyArray<{
			expected: string;
			globals: RuntimeGlobals;
			name: string;
		}>;

		for (const { name, globals, expected } of cases) {
			const runtimeGlobals = globalThis as typeof globalThis & RuntimeGlobals;
			runtimeGlobals.browser = globals.browser;
			runtimeGlobals.chrome = globals.chrome;

			expect(getFollowingPageUrl(), name).toBe(expected);
		}
	});
});
