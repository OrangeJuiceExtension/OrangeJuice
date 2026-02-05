import fitTextarea from 'fit-textarea';
import type { ContentScriptContext } from '#imports';

import { dom } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';

const validPaths = [...paths.comments, '/user'];

export const resizeTextarea = (ctx: ContentScriptContext, doc: Document): void => {
	if (!validPaths.some((p) => document.location.pathname.startsWith(p))) {
		return;
	}

	const textareas = doc.querySelectorAll('textarea');

	for (const textarea of textareas) {
		fitTextarea.watch(textarea);
	}

	const observer = dom.newReplyTextareasObserver((event: KeyboardEvent) => {
		fitTextarea.watch(event.target as HTMLTextAreaElement);
	});

	ctx.onInvalidated(() => observer?.disconnect());
};
