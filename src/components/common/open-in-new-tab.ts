import type { ContentScriptContext } from '#imports';
/**
 * Opens story title links in new tabs using the browser tab service
 */
export const openInNewTab = (_ctx: ContentScriptContext, doc: Document) => {
	const anchors = doc.querySelectorAll('.titleline > a') as NodeListOf<HTMLAnchorElement>;
	for (const anchor of anchors) {
		anchor.target = '_blank';
		anchor.rel = 'noopener';
	}

	for (const anchor of doc.querySelectorAll<HTMLAnchorElement>('.subline a')) {
		if (anchor.innerText.includes('comment')) {
			anchor.target = '_blank';
			anchor.rel = 'noopener';
		}
	}
};
