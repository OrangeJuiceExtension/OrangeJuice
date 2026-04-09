import type { ContentScriptContext } from '#imports';
import { getOpenStoryNewTabPreference } from '@/utils/preferences.ts';
import { registerPreferencesUpdateHandler } from '@/utils/preferences-live.ts';

const applyOpenInNewTabPreference = async (doc: Document): Promise<void> => {
	const anchors = doc.querySelectorAll('.titleline > a') as NodeListOf<HTMLAnchorElement>;
	const openStoryNewTab = await getOpenStoryNewTabPreference();

	for (const anchor of anchors) {
		if (openStoryNewTab) {
			anchor.target = '_blank';
			anchor.rel = 'noopener noreferrer';
			continue;
		}

		anchor.removeAttribute('target');
		anchor.removeAttribute('rel');
	}

	for (const anchor of doc.querySelectorAll<HTMLAnchorElement>('.subline a')) {
		if (anchor.innerText.includes('comment')) {
			anchor.target = '_blank';
			anchor.rel = 'noopener noreferrer';
		}
	}
};
/**
 * Opens story title links in new tabs using the browser tab service
 */
export const openInNewTab = async (ctx: ContentScriptContext, doc: Document): Promise<void> => {
	await applyOpenInNewTabPreference(doc);
	registerPreferencesUpdateHandler(ctx, async () => {
		await applyOpenInNewTabPreference(doc);
	});
};
