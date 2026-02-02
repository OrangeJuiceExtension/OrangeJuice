import { browser, defineBackground } from '#imports';
import { createBackgroundServices } from '@/services/manager.ts';

export const main = () => {
	// This allows the service-worker to remain resident in the background
	// https://stackoverflow.com/questions/66618136/persistent-service-worker-in-chrome-extension
	const keepAlive = () => {
		setInterval(browser.runtime.getPlatformInfo, 1000);
		browser.webNavigation.onHistoryStateUpdated.addListener(() => {
			console.log({ info: 'background onHistoryStateUpdated active', date: Date.now() });
		});
	};
	keepAlive();

	createBackgroundServices();
};

export default defineBackground({ main });
