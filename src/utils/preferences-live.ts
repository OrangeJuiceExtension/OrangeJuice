import type { ContentScriptContext } from '#imports';

export const PREFERENCES_UPDATED_MESSAGE_TYPE = 'oj:preferences-updated';

type PreferencesUpdateHandler = () => Promise<void> | void;

const handlers = new Set<PreferencesUpdateHandler>();

export const registerPreferencesUpdateHandler = (
	ctx: ContentScriptContext,
	handler: PreferencesUpdateHandler
): void => {
	handlers.add(handler);
	ctx.onInvalidated(() => {
		handlers.delete(handler);
	});
};

export const notifyPreferencesUpdated = async (): Promise<void> => {
	await Promise.allSettled(Array.from(handlers, (handler) => handler()));
};
