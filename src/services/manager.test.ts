import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClientServices, type ServicesManager } from './manager.ts';

describe('createClientServices', () => {
	let manager: ServicesManager;

	beforeEach(() => {
		vi.clearAllMocks();
		manager = createClientServices();
	});

	it('should create getter methods for each service', () => {
		expect(typeof manager.getHighlightService).toBe('function');
		expect(typeof manager.getReadStoriesService).toBe('function');
		expect(typeof manager.getFetchRemoteService).toBe('function');
		expect(typeof manager.getBrowserTabService).toBe('function');
	});

	it('should return service instances from getter methods', () => {
		const highlightService = manager.getHighlightService();
		const readStoriesService = manager.getReadStoriesService();
		const fetchRemoteService = manager.getFetchRemoteService();
		const browserTabService = manager.getBrowserTabService();

		expect(highlightService).toBeDefined();
		expect(readStoriesService).toBeDefined();
		expect(fetchRemoteService).toBeDefined();
		expect(browserTabService).toBeDefined();
	});

	it('should return the same instance on subsequent calls (singleton pattern)', () => {
		const manager1 = createClientServices();
		const manager2 = createClientServices();

		expect(manager1).toBe(manager2);
	});

	it('should maintain service references after multiple getter calls', () => {
		const service1 = manager.getHighlightService();
		const service2 = manager.getHighlightService();
		const service3 = manager.getHighlightService();

		expect(service1).toBe(service2);
		expect(service2).toBe(service3);
	});
});
