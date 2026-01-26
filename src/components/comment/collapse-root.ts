import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { dom } from '@/utils/dom';

export function getCommentIndentation(element: HTMLElement) {
	const res = element.querySelector<HTMLImageElement>('.ind img');
	if (res) {
		const indentation = res.width / 40;
		return indentation;
	}
}

export const collapseRoot = (
	doc: Document,
	comments: HTMLElement[],
	ctx: ContentScriptContext
): void => {
	let currentRootComment: HTMLElement;

	for (const comment of comments) {
		const indentLevel = getCommentIndentation(comment);

		if (indentLevel === 0) {
			currentRootComment = comment;
			continue;
		}

		// @ts-expect-error
		const instCurrentRootComment = currentRootComment;
		const toggle = doc.createElement('a');
		toggle.innerText = '[collapse root]';
		toggle.style.cursor = 'pointer';

		const clickHandler = () => {
			const togg = instCurrentRootComment.querySelector<HTMLAnchorElement>('a.togg');
			if (togg) {
				togg.click();
			}
			const { x, y } = dom.elementPosition(doc, instCurrentRootComment);
			window.scrollTo(x, y);
		};
		toggle.addEventListener('click', clickHandler);

		const comhead = comment.querySelector('span.comhead');
		if (comhead) {
			comhead.append(toggle);

			// Add a bit of space to the right of the navs element to give the [collapse root] button some breathing room
			const navs = comhead.getElementsByClassName(
				'navs'
			) as HTMLCollectionOf<HTMLSpanElement>;

			if (navs.length) {
				navs[0].style.marginRight = '4px';
			}
		}

		ctx.onInvalidated(() => {
			toggle.removeEventListener('click', clickHandler);
		});
	}
};
