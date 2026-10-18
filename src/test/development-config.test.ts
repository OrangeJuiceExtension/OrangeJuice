import { afterEach, describe, expect, it, vi } from 'vitest';
import { scripts } from '../../package.json';

const MANUAL_BROWSER_ENV_PATTERN = /(?:^|\s)OJ_MANUAL_BROWSER=(\S+)/;

describe('Chrome development commands', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it.each(['dev', 'dev:manual'] as const)(
		'%s disables browser launching so the installed Chrome profile can be used',
		async (command) => {
			const manualBrowser = scripts[command].match(MANUAL_BROWSER_ENV_PATTERN)?.[1] ?? '';
			vi.stubEnv('OJ_MANUAL_BROWSER', manualBrowser);
			vi.resetModules();
			const { default: config } = await import('../../wxt.config.ts');
			expect(config.webExt?.disabled).toBe(true);
		}
	);
});
