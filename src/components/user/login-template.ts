import { hideBody, showBody } from '@/components/common/hide-body.ts';
import { wrapBodyWithHnTemplate } from '@/components/common/hn-template.tsx';

export const loginTemplate = (doc: Document, username: string | null = null) => {
	const pathname = window.location.pathname;

	const shouldRender =
		pathname.startsWith('/login') ||
		(username === null &&
			(pathname.startsWith('/submit') ||
				pathname.startsWith('/newpoll') ||
				pathname.startsWith('/comment')));

	if (!shouldRender) {
		return;
	}

	hideBody(doc);
	wrapBodyWithHnTemplate(doc);
	showBody(doc);
};
