import linkifyHtml from 'linkify-html';
import type { ContentScriptContext } from '#imports';

export const userAboutLinkify = (_ctx: ContentScriptContext, doc: Document) => {
	if (window.location.pathname.startsWith('/user')) {
		return;
	}

	const infoTable = doc.querySelector('#bigbox table');
	if (!infoTable) {
		return;
	}
	const tds = infoTable.getElementsByTagName('td');
	if (!tds) {
		return;
	}

	for (const row of tds) {
		if (row?.nextElementSibling && row.innerText === 'about:' && row.nextElementSibling) {
			if (row.nextElementSibling.getElementsByTagName('textarea').length) {
				break;
			}
			row.nextElementSibling.innerHTML = linkifyHtml(row.nextElementSibling.innerHTML, {
				attributes: {
					rel: 'noopener',
					target: '_blank',
				},
			});
			break;
		}
	}
};
