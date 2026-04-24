import type { Browser } from '#imports';

const INSTALL_REASON = 'install';

export interface WelcomeInstallApi {
	addInstalledListener: (
		callback: (details: { reason?: string }) => void | Promise<void>
	) => void;
	createTab: (properties: Browser.tabs.CreateProperties) => Promise<unknown>;
	getWelcomePageUrl: () => string;
	installReason?: string;
}

export const getInstallReason = (api: WelcomeInstallApi): string =>
	api.installReason ?? INSTALL_REASON;

export const openWelcomePage = async (api: WelcomeInstallApi): Promise<void> => {
	await api.createTab({
		active: true,
		url: api.getWelcomePageUrl(),
	});
};

export const registerWelcomePageOnInstall = (api: WelcomeInstallApi): void => {
	const installReason = getInstallReason(api);

	api.addInstalledListener(async ({ reason }) => {
		if (reason !== installReason) {
			return;
		}

		await openWelcomePage(api);
	});
};

export const createWelcomeInstallApi = (config: {
	addInstalledListener: (
		callback: (details: { reason?: string }) => void | Promise<void>
	) => void;
	createTab: (properties: Browser.tabs.CreateProperties) => Promise<unknown>;
	getWelcomePageUrl: () => string;
	installReason?: string;
}): WelcomeInstallApi => ({
	addInstalledListener: config.addInstalledListener,
	createTab: config.createTab,
	getWelcomePageUrl: config.getWelcomePageUrl,
	installReason: config.installReason,
});
