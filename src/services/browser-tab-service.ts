import { type Browser, browser } from '#imports';

export class BrowserTabService {
	// biome-ignore lint/style/useThisInClassMethods: comctx exposes this operation through the service instance.
	async createTab(request: Browser.tabs.CreateProperties) {
		const tabs = await browser.tabs.query({});

		let activeTab: Browser.tabs.Tab | undefined;
		for (const tab of tabs) {
			if (tab.active) {
				activeTab = tab;
			}
		}

		const index = activeTab ? activeTab.index + 1 : request.index;

		const opts = {
			...request,
			active: false,
			index,
		};

		await browser.tabs.create(opts);
	}
}
