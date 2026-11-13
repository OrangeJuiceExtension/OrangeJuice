import type { Browser } from '#imports';

export interface MessageMeta {
	injector?: 'content' | 'popup';
	sender?: Browser.runtime.MessageSender;
	url: string;
}
export const TAB_ID_NONE = -1;
