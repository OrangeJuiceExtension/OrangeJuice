import { type Browser, browser } from '@wxt-dev/browser';

export class BrowserTabService {
	async createTab(request: Browser.tabs.CreateProperties) {
		const current = await browser.tabs.getCurrent();
		const index = current === undefined ? request.index : current.index + 1;
		return browser.tabs.create({ ...request, index, active: false });
	}
}
