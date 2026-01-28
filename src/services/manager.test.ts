import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('comctx', () => ({
	defineProxy: vi.fn((factory) => {
		const mockService = factory();
		const mockInject = vi.fn(() => mockService);
		const mockProvide = vi.fn();
		return [mockProvide, mockInject];
	}),
}));

vi.mock('@/services/fetch-remote-service.ts', () => ({
	FetchRemoteService: vi.fn(),
}));

vi.mock('@/services/highlight-unread-comments-service.ts', () => ({
	HighlightUnreadCommentsService: vi.fn(),
}));

vi.mock('@/services/read-stories-service.ts', () => ({
	ReadStoriesService: vi.fn(),
}));

vi.mock('@/utils/browser-runtime.ts', () => ({
	InjectAdapter: vi.fn(),
	ProvideAdapter: vi.fn(),
}));

describe('createServicesManager', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset the cached manager before each test
		// We need to clear the module cache to reset the singleton
		vi.resetModules();
	});

	it('should return a services manager with started map', async () => {
		const { createServicesManager } = await import('./manager.ts');
		const manager = createServicesManager();

		expect(manager.started).toBeInstanceOf(Map);
	});

	it('should initialize all services in the registry', async () => {
		const { createServicesManager } = await import('./manager.ts');
		const manager = createServicesManager();

		expect(manager.started.size).toBe(3);
		expect(manager.started.has('oj_highlight_unread')).toBe(true);
		expect(manager.started.has('oj_read_stories')).toBe(true);
		expect(manager.started.has('oj_fetch_remote')).toBe(true);
	});

	it('should create getter methods for each service', async () => {
		const { createServicesManager } = await import('./manager.ts');
		const manager = createServicesManager();

		expect(typeof manager.getHighlightService).toBe('function');
		expect(typeof manager.getReadStoriesService).toBe('function');
		expect(typeof manager.getFetchRemoteService).toBe('function');
	});

	it('should return correct service instances from getter methods', async () => {
		const { createServicesManager } = await import('./manager.ts');
		const manager = createServicesManager();

		const highlightService = manager.getHighlightService();
		const readStoriesService = manager.getReadStoriesService();
		const fetchRemoteService = manager.getFetchRemoteService();

		expect(highlightService).toBe(manager.started.get('oj_highlight_unread'));
		expect(readStoriesService).toBe(manager.started.get('oj_read_stories'));
		expect(fetchRemoteService).toBe(manager.started.get('oj_fetch_remote'));
	});

	it('should return the same instance on subsequent calls (singleton pattern)', async () => {
		const { createServicesManager } = await import('./manager.ts');
		const manager1 = createServicesManager();
		const manager2 = createServicesManager();

		expect(manager1).toBe(manager2);
	});

	it('should reuse the same started map across multiple calls', async () => {
		const { createServicesManager } = await import('./manager.ts');
		const manager1 = createServicesManager();
		const manager2 = createServicesManager();

		expect(manager1.started).toBe(manager2.started);
	});

	it('should create InjectAdapter with content injector type', async () => {
		const { InjectAdapter } = await import('@/utils/browser-runtime.ts');
		const { createServicesManager } = await import('./manager.ts');

		createServicesManager();

		expect(InjectAdapter).toHaveBeenCalledWith('content');
	});

	it('should call defineProxy for each service in registry', async () => {
		const { defineProxy } = await import('comctx');
		const { createServicesManager } = await import('./manager.ts');

		createServicesManager();

		// Should be called 3 times (once for each service)
		expect(defineProxy).toHaveBeenCalledTimes(3);
		expect(defineProxy).toHaveBeenCalledWith(expect.any(Function), {
			namespace: 'oj_highlight_unread',
		});
		expect(defineProxy).toHaveBeenCalledWith(expect.any(Function), {
			namespace: 'oj_read_stories',
		});
		expect(defineProxy).toHaveBeenCalledWith(expect.any(Function), {
			namespace: 'oj_fetch_remote',
		});
	});

	it('should maintain service references after multiple getter calls', async () => {
		const { createServicesManager } = await import('./manager.ts');
		const manager = createServicesManager();

		const service1 = manager.getHighlightService();
		const service2 = manager.getHighlightService();
		const service3 = manager.getHighlightService();

		expect(service1).toBe(service2);
		expect(service2).toBe(service3);
	});

	it('should store services with correct namespace keys', async () => {
		const { createServicesManager } = await import('./manager.ts');
		const manager = createServicesManager();

		const keys = Array.from(manager.started.keys());

		expect(keys).toContain('oj_highlight_unread');
		expect(keys).toContain('oj_read_stories');
		expect(keys).toContain('oj_fetch_remote');
		expect(keys.length).toBe(3);
	});

	it('should have all services defined and not undefined', async () => {
		const { createServicesManager } = await import('./manager.ts');
		const manager = createServicesManager();

		const highlightService = manager.getHighlightService();
		const readStoriesService = manager.getReadStoriesService();
		const fetchRemoteService = manager.getFetchRemoteService();

		expect(highlightService).toBeDefined();
		expect(readStoriesService).toBeDefined();
		expect(fetchRemoteService).toBeDefined();
	});
});
