import { browser, defineBackground } from '#imports';
import {
	createWelcomeInstallApi,
	registerWelcomePageOnInstall,
} from '@/entrypoints/background/welcome-on-install.ts';
import { createBackgroundServices } from '@/services/manager.ts';

export const main = () => {
	// This allows the service-worker to remain resident in the background
	// https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
	// const keepAlive = () => {
	// 	setInterval(browser.runtime.getPlatformInfo, 1000);
	// 	browser.webNavigation.onHistoryStateUpdated.addListener(() => {
	// 		console.log({ info: 'background onHistoryStateUpdated active', date: Date.now() });
	// 	});
	// };
	// keepAlive();

	createBackgroundServices();
	registerWelcomePageOnInstall(
		createWelcomeInstallApi({
			addInstalledListener: browser.runtime.onInstalled.addListener.bind(
				browser.runtime.onInstalled
			),
			createTab: browser.tabs.create.bind(browser.tabs),
			getWelcomePageUrl: () => browser.runtime.getURL('/welcome.html'),
			installReason: browser.runtime.OnInstalledReason?.INSTALL,
		})
	);
};

export default defineBackground({ main });
