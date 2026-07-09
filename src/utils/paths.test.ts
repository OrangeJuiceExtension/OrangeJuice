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
				expected: 'moz-extension://test/following.html',
				globals: {
					browser: {
						runtime: {
							getURL: (path: string) => `moz-extension://test${path}`,
						},
					},
				},
				name: 'browser runtime',
			},
			{
				expected: 'chrome-extension://test/following.html',
				globals: {
					chrome: {
						runtime: {
							getURL: (path: string) => `chrome-extension://test${path}`,
						},
					},
				},
				name: 'chrome runtime fallback',
			},
			{
				expected: '/following.html',
				globals: {},
				name: 'plain fallback',
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
