import type { Adapter, Message, OnMessage, SendMessage } from 'comctx';
import { type Browser, browser } from '#imports';
import { type MessageMeta, TAB_ID_NONE } from '@/utils/comctx-adapters.ts';

export class ProvideAdapter implements Adapter<MessageMeta> {
	// biome-ignore lint/style/useThisInClassMethods: comctx requires an instance SendMessage callback.
	sendMessage: SendMessage<MessageMeta> = async (message) => {
		const injector: string | undefined = message.meta.injector;
		switch (injector) {
			case 'content':
				{
					const tabs: Browser.tabs.Tab[] = await browser.tabs.query({
						url: message.meta.url,
					});

					if (!tabs.length) {
						console.log({
							error: 'unable to find the tab to send a message back',
							message,
						});
					}
					// Send a message to the content-script
					try {
						tabs.map((tab) =>
							browser.tabs.sendMessage(tab.id ?? TAB_ID_NONE, message).catch((e) => {
								console.log({ e, error: 'provider tab.sendMessage' });
							})
						);
					} catch (e) {
						console.log({ e, error: 'provider content sendMessage' });
					}
				}
				break;
			case 'popup': {
				// Send a message to the popup or other internal pages
				await browser.runtime.sendMessage(browser.runtime.id, message).catch((error) => {
					/**
					 * When the popup page is closed, sending a message to the popup will cause an error.
					 * In the pub/sub pattern, we can assume that the subscriber doesn’t exist,
					 * so we can safely ignore the error here.
					 */
					if (error.message.includes('Receiving end does not exist')) {
						return;
					}
					throw error;
				});
				break;
			}
			default:
				break;
		}
	};

	// biome-ignore lint/style/useThisInClassMethods: comctx requires an instance OnMessage callback.
	onMessage: OnMessage<MessageMeta> = (callback) => {
		const handler = (
			message: Partial<Message<MessageMeta>>
			// sender: Browser.runtime.MessageSender
		) => {
			try {
				callback(message);
			} catch (e) {
				console.log({ e, error: 'failed to execute handler' });
			}
			// callback({ ...message, args: [...(message?.args || []), sender] });
		};
		browser.runtime.onMessage.addListener(handler);
		return () => browser.runtime.onMessage.removeListener(handler);
	};
}
