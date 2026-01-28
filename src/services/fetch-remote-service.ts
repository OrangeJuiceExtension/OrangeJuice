import { dom } from '@/utils/dom.ts';

export class FetchRemoteService {
	getPageDom(url: string): Promise<HTMLElement | undefined> | undefined {
		try {
			return dom.getPageDom(url);
		} catch (e) {
			console.error('Error in FetchRemoteService:', e);
		}
		return undefined;
	}
	async fetchJson<T>(url: string): Promise<T | undefined> {
		try {
			const response = await fetch(url, { cache: 'force-cache' });
			return response.json();
		} catch (e) {
			console.error('Error in FetchRemoteService:', e);
		}
		return undefined;
	}
}
