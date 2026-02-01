import { defineProxy } from 'comctx';
import { browser } from '#imports';
import { BrowserTabService } from '@/services/browser-tab-service.ts';
import { FetchRemoteService } from '@/services/fetch-remote-service.ts';
import { HighlightUnreadCommentsService } from '@/services/highlight-unread-comments-service.ts';
import { ReadStoriesService } from '@/services/read-stories-service.ts';
import { InjectAdapter, ProvideAdapter } from '@/utils/browser-runtime.ts';

// Service registry configuration - add new services here
const SERVICE_REGISTRY = {
	Highlight: {
		namespace: 'oj_highlight_unread',
		class: HighlightUnreadCommentsService,
		background: true,
	},
	ReadStories: {
		namespace: 'oj_read_stories',
		class: ReadStoriesService,
		background: true,
	},
	FetchRemote: {
		namespace: 'oj_fetch_remote',
		class: FetchRemoteService,
		background: true,
	},
	BrowserTab: {
		namespace: 'oj_browser_tab_service',
		class: BrowserTabService,
		background: true,
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
type Service = ServiceMap[ServiceKey];

type ServiceGetter<K extends ServiceKey> = () => ServiceMap[K];

export type ServicesManager = {
	started: Map<string, Service>;
} & {
	[K in ServiceKey as `get${K}Service`]: ServiceGetter<K>;
};

let cachedManager: ServicesManager | undefined;

export const createServicesManager = (): ServicesManager => {
	if (cachedManager) {
		return cachedManager;
	}

	const started = new Map<string, Service>();
	const adapter = new InjectAdapter('content');

	for (const config of Object.values(SERVICE_REGISTRY)) {
		const [, injectService] = defineProxy(() => ({}) as InstanceType<typeof config.class>, {
			namespace: config.namespace,
		});
		started.set(config.namespace, injectService(adapter));
	}

	const manager: Record<string, unknown> = { started };

	for (const [key, config] of Object.entries(SERVICE_REGISTRY)) {
		manager[`get${key}Service`] = () => started.get(config.namespace);
	}

	cachedManager = manager as ServicesManager;
	return cachedManager;
};

export const initBackgroundServices = (): void => {
	initServices(true);
};

export const initContentServices = (): void => {
	initServices(false);
};

const initServices = (background: boolean): void => {
	const adapter = new ProvideAdapter();

	for (const config of Object.values(SERVICE_REGISTRY)) {
		if (config.background === background) {
			const [provideService] = defineProxy(() => new config.class(), {
				namespace: config.namespace,
			});
			provideService(adapter);
		}
	}
};
