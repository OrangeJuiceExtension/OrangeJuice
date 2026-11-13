import type { Adapter, Message, OnMessage, SendMessage } from 'comctx';
import { browser } from '#imports';
import type { MessageMeta } from '@/utils/comctx-adapters.ts';

export class InjectAdapter implements Adapter<MessageMeta> {
	injector?: 'content' | 'popup';

	constructor(injector?: 'content' | 'popup') {
		this.injector = injector;
	}
	sendMessage: SendMessage<MessageMeta> = (message) =>
		browser.runtime.sendMessage(browser.runtime.id, {
			...message,
			meta: {
				injector: this.injector,
				message,
				url: document.location.href.split('#')[0],
			},
		});
	// biome-ignore lint/style/useThisInClassMethods: comctx requires an instance OnMessage callback.
	onMessage: OnMessage<MessageMeta> = (callback) => {
		const handler = (
			message: Partial<Message<MessageMeta>>
			// sender: Browser.runtime.MessageSender
		) => {
			callback(message);
			// callback({ ...message, args: [...(message?.args || []), sender] });
		};
		browser.runtime.onMessage.addListener(handler);
		return () => browser.runtime.onMessage.removeListener(handler);
	};
}
