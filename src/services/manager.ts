import { defineProxy } from 'comctx';
import type { BrowserTabService } from '@/services/browser-tab-service.ts';
import type { FetchRemoteService } from '@/services/fetch-remote-service.ts';
import type { HighlightUnreadCommentsService } from '@/services/highlight-unread-comments-service.ts';
import type { MermaidService } from '@/services/mermaid-service.ts';
import type { ReadStoriesService } from '@/services/read-stories-service.ts';
import { InjectAdapter } from '@/utils/comctx-adapters.ts';

export const SERVICE_NAMESPACES = {
	BrowserTab: 'oj_browser_tab_service',
	FetchRemote: 'oj_fetch_remote',
	Highlight: 'oj_highlight_unread',
	Mermaid: 'oj_mermaid',
	ReadStories: 'oj_read_stories',
} as const;

export interface ServiceMap {
	BrowserTab: BrowserTabService;
	FetchRemote: FetchRemoteService;
	Highlight: HighlightUnreadCommentsService;
	Mermaid: MermaidService;
	ReadStories: ReadStoriesService;
}

type ServiceKey = keyof ServiceMap;
export type ServicesManager = {
	[K in ServiceKey as `get${K}Service`]: () => ServiceMap[K];
};

let cachedClientServices: ServicesManager | undefined;
export const createClientServices = (): ServicesManager => {
	if (cachedClientServices) {
		return cachedClientServices;
	}
	const manager: Record<string, unknown> = {};
	const adapter = new InjectAdapter('content');
	for (const key of Object.keys(SERVICE_NAMESPACES) as ServiceKey[]) {
		const [, injectService] = defineProxy(() => ({}) as ServiceMap[typeof key], {
			namespace: SERVICE_NAMESPACES[key],
		});
		let cachedService: ServiceMap[typeof key] | undefined;
		manager[`get${key}Service`] = () => {
			cachedService ??= injectService(adapter);
			return cachedService;
		};
	}
	cachedClientServices = manager as ServicesManager;
	return cachedClientServices;
};
