import { defineProxy } from 'comctx';
import { BrowserTabService } from '@/services/browser-tab-service.ts';
import { FetchRemoteService } from '@/services/fetch-remote-service.ts';
import { HighlightUnreadCommentsService } from '@/services/highlight-unread-comments-service.ts';
import { SERVICE_NAMESPACES, type ServiceMap } from '@/services/manager.ts';
import { MermaidService } from '@/services/mermaid-service.ts';
import { ReadStoriesService } from '@/services/read-stories-service.ts';
import { ProvideAdapter } from '@/utils/comctx-adapters.ts';

// Keep provider implementations out of the content-script dependency graph.
const SERVICE_FACTORIES = {
	BrowserTab: () => new BrowserTabService(),
	FetchRemote: () => new FetchRemoteService(),
	Highlight: () => new HighlightUnreadCommentsService(),
	Mermaid: () => new MermaidService(),
	ReadStories: () => new ReadStoriesService(),
} satisfies { [K in keyof ServiceMap]: () => ServiceMap[K] };

export const createBackgroundServices = (): void => {
	const adapter = new ProvideAdapter();
	for (const key of Object.keys(SERVICE_FACTORIES) as (keyof ServiceMap)[]) {
		const [provideService] = defineProxy(SERVICE_FACTORIES[key], {
			namespace: SERVICE_NAMESPACES[key],
		});
		provideService(adapter);
	}
};
