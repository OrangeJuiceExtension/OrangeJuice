import type { Message, OnMessage } from 'comctx';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Browser, browser } from '#imports';
import type { MessageMeta } from '@/utils/comctx-adapters.ts';
import { InjectAdapter } from '@/utils/inject-adapter.ts';
import { ProvideAdapter } from '@/utils/provide-adapter.ts';

vi.mock('#imports', () => ({
	browser: {
		runtime: {
			id: 'test-id',
			onMessage: {
				addListener: vi.fn(),
				removeListener: vi.fn(),
			},
			sendMessage: vi.fn(() => Promise.resolve()),
		},
		tabs: {
			query: vi.fn(() => Promise.resolve([])),
			sendMessage: vi.fn(() => Promise.resolve()),
		},
	},
}));

const createMessage = (injector: MessageMeta['injector']): Message<MessageMeta> => ({
	id: 'test-message',
	meta: { injector, url: 'https://news.ycombinator.com/item?id=1' },
	namespace: 'test',
	path: [],
	sender: { type: 'injector' },
	timeStamp: 0,
	type: 'ping',
});

const tab: Browser.tabs.Tab = {
	active: true,
	autoDiscardable: true,
	discarded: false,
	frozen: false,
	groupId: -1,
	highlighted: true,
	incognito: false,
	index: 0,
	lastAccessed: 0,
	pinned: false,
	selected: true,
	windowId: 1,
};

describe('comctx-adapters', () => {
	describe('InjectAdapter', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue(undefined);
		});

		it('should split url before hash when sending message', async () => {
			const locationSpy = vi
				.spyOn(document.location, 'href', 'get')
				.mockReturnValue('https://news.ycombinator.com/item?id=1#reply');
			const adapter = new InjectAdapter('content');
			const message = createMessage('content');

			await adapter.sendMessage(message, []);

			expect(browser.runtime.sendMessage).toHaveBeenCalledWith(expect.any(String), {
				...message,
				meta: {
					injector: 'content',
					message,
					url: 'https://news.ycombinator.com/item?id=1',
				},
			});

			locationSpy.mockRestore();
		});
	});

	describe('ProvideAdapter', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.spyOn(browser.runtime, 'sendMessage').mockResolvedValue(undefined);
			vi.spyOn(browser.tabs, 'sendMessage').mockResolvedValue(undefined);
			vi.spyOn(browser.tabs, 'query').mockImplementation(async () => []);
			vi.spyOn(browser.runtime.onMessage, 'addListener');
			vi.spyOn(browser.runtime.onMessage, 'removeListener');
		});

		it('should send message to matching content tabs', async () => {
			const adapter = new ProvideAdapter();
			vi.mocked(browser.tabs.query).mockImplementation(async () => [
				{ ...tab, id: 1 },
				{ ...tab, id: 2 },
			]);

			await adapter.sendMessage(createMessage('content'), []);

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
			vi.mocked(browser.tabs.query).mockImplementation(async () => []);
			const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			await adapter.sendMessage(createMessage('content'), []);

			expect(logSpy).toHaveBeenCalledWith(
				expect.objectContaining({ error: 'unable to find the tab to send a message back' })
			);
		});

		it('should send message to popup via runtime', async () => {
			const adapter = new ProvideAdapter();
			await adapter.sendMessage(createMessage('popup'), []);

			expect(browser.runtime.sendMessage).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ type: 'ping' })
			);
		});

		it('should ignore popup errors when receiving end does not exist', async () => {
			const adapter = new ProvideAdapter();
			const error = new Error('Receiving end does not exist');
			vi.mocked(browser.runtime.sendMessage).mockRejectedValueOnce(error);

			await expect(adapter.sendMessage(createMessage('popup'), [])).resolves.toBeUndefined();
		});

		it('should register and remove onMessage handlers', () => {
			const adapter = new ProvideAdapter();
			const handler = vi.fn<Parameters<OnMessage<MessageMeta>>[0]>();

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
