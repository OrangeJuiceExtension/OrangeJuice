import type { ContentScriptContext } from '#imports';

export const addOrangeJuiceLink = (_ctx: ContentScriptContext, doc: Document, version: string) => {
	const pathname = window.location.pathname;
	if (pathname.startsWith('/login') || pathname.startsWith('/submit')) {
		return;
	}

	const footer = doc.querySelector('.yclinks');
	if (!footer) {
		return;
	}

	// Find the "Contact" link
	const links = footer.querySelectorAll('a');
	let contactLink: Element | null = null;

	for (const link of links) {
		if (link.textContent?.toLowerCase() === 'contact') {
			contactLink = link;
			break;
		}
	}

	if (!contactLink) {
		return;
	}

	// Create separator
	const separator = doc.createElement('span');
	separator.innerHTML = ' | ';

	// Create an Orange Juice link
	const ojLink = doc.createElement('a') as HTMLAnchorElement;
	ojLink.href = 'https://oj-hn.com/';
	ojLink.textContent = 'Orange Juice';
	ojLink.setAttribute('title', version);
	ojLink.rel = 'noreferrer';
	ojLink.target = '_blank';

	// Insert after a contact link
	const nextNode = contactLink.nextSibling;
	if (nextNode) {
		footer.insertBefore(separator, nextNode);
		footer.insertBefore(ojLink, nextNode);
	} else {
		footer.appendChild(separator);
		footer.appendChild(ojLink);
	}
};
