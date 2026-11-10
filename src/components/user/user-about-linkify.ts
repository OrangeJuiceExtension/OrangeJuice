import type { ContentScriptContext } from '#imports';
import { linkifyTextNodes } from '@/utils/html.ts';

export const userAboutLinkify = (_ctx: ContentScriptContext, doc: Document) => {
	if (window.location.pathname.startsWith('/user')) {
		return;
	}

	const infoTable = doc.querySelector('#bigbox table');
	if (!infoTable) {
		return;
	}
	const tds = infoTable.querySelectorAll('td');

	for (const row of tds) {
		if (row.nextElementSibling && row.textContent === 'about:') {
			if (row.nextElementSibling.querySelector('textarea')) {
				break;
			}
			linkifyTextNodes(row.nextElementSibling, { openInNewTab: true });
			break;
		}
	}
};
