import { type Browser, browser } from '@wxt-dev/browser';

export class BrowserTabService {
	createTab(request: Browser.tabs.CreateProperties) {
		return browser.tabs.create({ ...request });
	}
}
