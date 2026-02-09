import type { ContentScriptContext } from '#imports';
import type { CommentData } from '@/components/comment/comment-data.ts';
import { dom } from '@/utils/dom';

export const collapseRoot = (
	ctx: ContentScriptContext,
	doc: Document,
	comments: HTMLElement[],
	commentData: CommentData
): void => {
	let currentRootComment: HTMLElement | undefined;

	for (const comment of comments) {
		const { width: indentLevel } = dom.getCommentIndentation(comment);

		if (!indentLevel || indentLevel === 0) {
			currentRootComment = comment;
			continue;
		}

		if (!currentRootComment) {
			continue;
		}

		const toggle = doc.createElement('a');
		toggle.innerText = '[collapse root]';
		toggle.style.cursor = 'pointer';

		const rootComment = currentRootComment;
		const clickHandler = async () => {
			const togg = rootComment.querySelector<HTMLAnchorElement>('a.togg');
			if (togg) {
				togg.click();

				if (currentRootComment) {
					const comm = commentData.getCommentFromElement(currentRootComment);
					if (comm) {
						await commentData.activate(comm);
					}
				}

				const { x, y } = dom.elementPosition(doc, rootComment);
				window.scrollTo(x, y);
			}
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
