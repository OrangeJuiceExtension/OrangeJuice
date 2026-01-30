import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createServicesManager } from '@/services/manager.ts';

/**
 * Opens story title links in new tabs using the browser tab service
 */
export const openInNewTab = (ctx: ContentScriptContext, doc: Document) => {
	const tabService = createServicesManager().getBrowserTabService();

	const handleClick = (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		const anchor = target.closest('a');

		if (!anchor) {
			return;
		}

		// Check if this is a story title link (inside .titleline)
		const titleline = anchor.closest('.titleline');
		if (titleline) {
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
