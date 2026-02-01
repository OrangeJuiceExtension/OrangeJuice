import type { ContentScriptContext } from '#imports';
import { createServicesManager } from '@/services/manager.ts';

/**
 * Opens comment links in new tabs using the browser tab service
 */
export const openInNewTab = (ctx: ContentScriptContext, doc: Document) => {
	const tabService = createServicesManager().getBrowserTabService();

	const handleClick = (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		const anchor = target.closest('a');

		if (!anchor) {
			return;
		}

		// Check if this is a comments link (ends with "comments")
		const subtext = anchor.closest('.subtext');
		if (subtext && anchor.textContent?.trim().endsWith('comments')) {
			event.preventDefault();
			tabService.createTab({ url: anchor.href, active: false });
			return;
		}
	};

	doc.addEventListener('click', handleClick);

	ctx.onInvalidated(() => {
		doc.removeEventListener('click', handleClick);
	});
};
