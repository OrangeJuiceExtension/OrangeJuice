import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from '#imports';
import { InjectAdapter, ProvideAdapter } from '@/utils/comctx-adapters.ts';

vi.mock('#imports', () => ({
	browser: {
		runtime: {
			id: 'test-id',
			sendMessage: vi.fn(() => Promise.resolve()),
			onMessage: {
				addListener: vi.fn(),
				removeListener: vi.fn(),
			},
		},
		tabs: {
			query: vi.fn(() => Promise.resolve([])),
			sendMessage: vi.fn(() => Promise.resolve()),
		},
	},
}));

describe('comctx-adapters', () => {
	describe('InjectAdapter', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue(undefined as any);
		});

		it('should split url before hash when sending message', async () => {
			const locationSpy = vi
				.spyOn(document, 'location', 'get')
				.mockReturnValue(new URL('https://news.ycombinator.com/item?id=1#reply') as any);
			const adapter = new InjectAdapter('content');

			await adapter.sendMessage({ type: 'ping' } as any, undefined as any);

			expect(browser.runtime.sendMessage).toHaveBeenCalledWith(expect.any(String), {
				type: 'ping',
				meta: {
					url: 'https://news.ycombinator.com/item?id=1',
					injector: 'content',
					message: { type: 'ping' },
				},
			});

			locationSpy.mockRestore();
		});
	});

	describe('ProvideAdapter', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue(undefined as any);
			vi.spyOn(browser.tabs, 'sendMessage').mockResolvedValue(undefined as any);
			// @ts-expect-error
			vi.spyOn(browser.tabs, 'query').mockResolvedValue([]);
			vi.spyOn(browser.runtime.onMessage, 'addListener');
			vi.spyOn(browser.runtime.onMessage, 'removeListener');
		});

		it('should send message to matching content tabs', async () => {
			const adapter = new ProvideAdapter();
			vi.mocked(browser.tabs.query).mockResolvedValue([{ id: 1 }, { id: 2 }] as any);

			await adapter.sendMessage(
				{
					type: 'ping',
					meta: { injector: 'content', url: 'https://news.ycombinator.com/item?id=1' },
				} as any,
				undefined as any
			);

			expect(browser.tabs.sendMessage).toHaveBeenCalledWith(
				1,
				expect.objectContaining({ type: 'ping' })
			);
			expect(browser.tabs.sendMessage).toHaveBeenCalledWith(
				2,
				expect.objectContaining({ type: 'ping' })
			);
		});

		it('should log when no matching content tabs are found', async () => {
			const adapter = new ProvideAdapter();
			// @ts-expect-error
			vi.mocked(browser.tabs.query).mockResolvedValue([]);
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			await adapter.sendMessage(
				{
					type: 'ping',
					meta: { injector: 'content', url: 'https://news.ycombinator.com/item?id=1' },
				} as any,
				undefined as any
			);

			expect(logSpy).toHaveBeenCalledWith(
				expect.objectContaining({ error: 'unable to find the tab to send a message back' })
			);
		});

		it('should send message to popup via runtime', async () => {
			const adapter = new ProvideAdapter();
			await adapter.sendMessage(
				{
					type: 'ping',
					meta: { injector: 'popup', url: 'https://news.ycombinator.com/item?id=1' },
				} as any,
				undefined as any
			);

			expect(browser.runtime.sendMessage).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ type: 'ping' })
			);
		});

		it('should ignore popup errors when receiving end does not exist', async () => {
			const adapter = new ProvideAdapter();
			const error = new Error('Receiving end does not exist');
			vi.mocked(browser.runtime.sendMessage).mockRejectedValueOnce(error);

			await expect(
				adapter.sendMessage(
					{
						type: 'ping',
						meta: { injector: 'popup', url: 'https://news.ycombinator.com/item?id=1' },
					} as any,
					undefined as any
				)
			).resolves.toBeUndefined();
		});

		it('should register and remove onMessage handlers', () => {
			const adapter = new ProvideAdapter();
			const handler = vi.fn();

			const cleanup = adapter.onMessage(handler);

			expect(browser.runtime.onMessage.addListener).toHaveBeenCalledWith(
				expect.any(Function)
			);

			if (typeof cleanup === 'function') {
				cleanup();
			}

			expect(browser.runtime.onMessage.removeListener).toHaveBeenCalledWith(
				expect.any(Function)
			);
		});
	});
});
