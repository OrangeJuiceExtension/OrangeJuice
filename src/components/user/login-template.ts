import { hideBody, showBody } from '@/components/common/hide-body.ts';
import { wrapBodyWithHnTemplate } from '@/components/common/hn-template.tsx';

const FNID_SELECTOR = 'input[type="hidden"][name="fnid"]';

export const loginTemplate = (doc: Document, username: string | null = null) => {
	const { pathname } = window.location;
	const hasFnidInput = doc.querySelector<HTMLInputElement>(FNID_SELECTOR) !== null;

	const shouldRender =
		!hasFnidInput &&
		(pathname.startsWith('/login') ||
			(username === null &&
				(pathname.startsWith('/submit') ||
					pathname.startsWith('/newpoll') ||
					pathname.startsWith('/comment'))));

	if (!shouldRender) {
		return;
	}

	hideBody(doc);
	wrapBodyWithHnTemplate(doc);
	showBody(doc);
};
