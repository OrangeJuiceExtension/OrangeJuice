import { defineBackground } from 'wxt/utils/define-background';
import { initBackgroundServices } from '@/services/manager.ts';

export const main = () => {
	// This allows the service-worker to remain resident in the background?
	// browser.webNavigation.onHistoryStateUpdated.addListener(() => {
	// 	console.log('background active');
	// });

	initBackgroundServices();
};

export default defineBackground(main);
