import { describe, expect, it, vi } from 'vitest';
import {
	createWelcomeInstallApi,
	getInstallReason,
	openWelcomePage,
	registerWelcomePageOnInstall,
	type WelcomeInstallApi,
} from '@/entrypoints/background/welcome-on-install.ts';

const createInstallApi = (): WelcomeInstallApi => ({
	addInstalledListener: vi.fn(),
	createTab: vi.fn().mockResolvedValue(undefined),
	getWelcomePageUrl: vi.fn(() => 'chrome-extension://orange-juice/welcome.html'),
	installReason: 'install',
});

describe('welcome-on-install', () => {
	it('should use the browser install reason when available', () => {
		const installApi = createInstallApi();

		expect(getInstallReason(installApi)).toBe('install');
	});

	it('should open the welcome page in a new active tab', async () => {
		const installApi = createInstallApi();

		await openWelcomePage(installApi);

		expect(installApi.getWelcomePageUrl).toHaveBeenCalled();
		expect(installApi.createTab).toHaveBeenCalledWith({
			active: true,
			url: 'chrome-extension://orange-juice/welcome.html',
		});
	});

	it('should register an install listener that opens the welcome page only on first install', async () => {
		const installApi = createInstallApi();

		registerWelcomePageOnInstall(installApi);

		const listener = vi.mocked(installApi.addInstalledListener).mock.calls[0]?.[0];
		if (!listener) {
			throw new Error('Expected install listener to be registered.');
		}

		await listener({ reason: 'update' });
		expect(installApi.createTab).not.toHaveBeenCalled();

		await listener({ reason: 'install' });
		expect(installApi.createTab).toHaveBeenCalledTimes(1);
	});

	it('should adapt browser runtime and tabs into the install API', async () => {
		const addListener = vi.fn();
		const create = vi.fn().mockResolvedValue(undefined);
		const installApi = createWelcomeInstallApi({
			addInstalledListener: addListener,
			createTab: create,
			getWelcomePageUrl: () => 'moz-extension://orange-juice/welcome.html',
			installReason: 'install',
		});

		registerWelcomePageOnInstall(installApi);

		const listener = addListener.mock.calls[0]?.[0];
		if (!listener) {
			throw new Error('Expected adapted install listener to be registered.');
		}

		await listener({ reason: 'install' });
		expect(create).toHaveBeenCalledWith({
			active: true,
			url: 'moz-extension://orange-juice/welcome.html',
		});
	});
});
