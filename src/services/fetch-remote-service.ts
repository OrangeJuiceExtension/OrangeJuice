import { dom } from '@/utils/dom.ts';

export class FetchRemoteService {
	// biome-ignore lint/style/useThisInClassMethods: comctx exposes this operation through the service instance.
	getPageDom(url: string): Promise<HTMLElement | undefined> | undefined {
		try {
			return dom.getPageDom(url);
		} catch (e) {
			console.error('Error in FetchRemoteService:', e);
		}
	}
	// biome-ignore lint/style/useThisInClassMethods: comctx exposes this operation through the service instance.
	async fetchJson<T>(url: string): Promise<T | undefined> {
		try {
			const response = await fetch(url, { cache: 'force-cache' });
			return response.json();
		} catch (e) {
			console.error('Error in FetchRemoteService:', e);
		}
	}
}
