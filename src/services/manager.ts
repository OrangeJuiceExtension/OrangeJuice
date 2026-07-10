import { defineProxy } from 'comctx';
import { BrowserTabService } from '@/services/browser-tab-service.ts';
import { FetchRemoteService } from '@/services/fetch-remote-service.ts';
import { HighlightUnreadCommentsService } from '@/services/highlight-unread-comments-service.ts';
import { ReadStoriesService } from '@/services/read-stories-service.ts';
import { InjectAdapter, ProvideAdapter } from '@/utils/comctx-adapters.ts';

// Service registry configuration - add new services here
const SERVICE_REGISTRY = {
	BrowserTab: {
		background: true,
		class: BrowserTabService,
		namespace: 'oj_browser_tab_service',
	},
	FetchRemote: {
		background: true,
		class: FetchRemoteService,
		namespace: 'oj_fetch_remote',
	},
	Highlight: {
		background: true,
		class: HighlightUnreadCommentsService,
		namespace: 'oj_highlight_unread',
	},
	ReadStories: {
		background: true,
		class: ReadStoriesService,
		namespace: 'oj_read_stories',
	},
} as const;

// Export namespaces object inferred from registry
export const SERVICE_NAMESPACES = Object.fromEntries(
	Object.entries(SERVICE_REGISTRY).map(([key, config]) => [key, config.namespace])
) as { [K in keyof typeof SERVICE_REGISTRY]: (typeof SERVICE_REGISTRY)[K]['namespace'] };

type ServiceKey = keyof typeof SERVICE_REGISTRY;
type ServiceMap = {
	[K in ServiceKey]: InstanceType<(typeof SERVICE_REGISTRY)[K]['class']>;
};

type ServiceGetter<K extends ServiceKey> = () => ServiceMap[K];

export type ServicesManager = {
	[K in ServiceKey as `get${K}Service`]: ServiceGetter<K>;
};

let cachedClientServices: ServicesManager | undefined;
export const createClientServices = (): ServicesManager => {
	if (cachedClientServices) {
		return cachedClientServices;
	}

	const manager = {} as Record<string, unknown>;
	const injectAdapter = new InjectAdapter('content');

	for (const [key, config] of Object.entries(SERVICE_REGISTRY)) {
		const [, injectService] = defineProxy(() => ({}) as InstanceType<typeof config.class>, {
			namespace: config.namespace,
		});
		let cachedService: InstanceType<typeof config.class> | undefined;
		manager[`get${key}Service`] = () => {
			cachedService ??= injectService(injectAdapter);
			return cachedService;
		};
	}

	cachedClientServices = manager as ServicesManager;
	return cachedClientServices;
};

export const createBackgroundServices = (): void => {
	initProviderServices(true);
};

export const initContentProviders = (): void => {
	initProviderServices(false);
};

const initProviderServices = (background: boolean): void => {
	const provideAdapter = new ProvideAdapter();
	for (const config of Object.values(SERVICE_REGISTRY)) {
		if (config.background === background) {
			const [provideService] = defineProxy(() => new config.class(), {
				namespace: config.namespace,
			});
			provideService(provideAdapter);
		}
	}
};
