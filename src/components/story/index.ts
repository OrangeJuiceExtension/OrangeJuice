import type { ContentScriptContext } from '#imports';
import { getNavState } from '@/components/common/index.ts';
import { hideReadStories } from '@/components/story/hide-read-stories.ts';
import { keyboardNavigation } from '@/components/story/keyboard-navigation.ts';
import { StoryData } from '@/components/story/story-data.ts';
import { paths } from '@/utils/paths.ts';

const allowedPaths = [
	'/',
	'/ask',
	'/newest',
	'/news',
	'/show',
	'/jobs',
	'/front',
	'/active',
	'/past',
	'/noobstories',
	'/classic',
	'/shownew',
	'/pool',
	'/best',
	'/launches',
	'/flagged',
	'/invited',
	'/asknew',
	'/submitted',
];

export const story: ComponentFeature = {
	id: 'story',
	loginRequired: false,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	async main(ctx: ContentScriptContext) {
		if (
			!allowedPaths.includes(window.location.pathname) ||
			window.location.search.includes('kind=comment')
		) {
			return;
		}

		const bigbox = document.querySelector('#bigbox') as HTMLElement;
		if (!bigbox) {
			return;
		}

		cleanupDom(document, bigbox);

		const storyRows = [...document.querySelectorAll<HTMLTableRowElement>('tr.athing')];
		const storyData = new StoryData(bigbox, storyRows);

		// Make sure to run hideReadStores before keyboardNavigation because otherwise, a story might
		// get hidden and then keyboardNavigation will not register the hidden story and navigate to it
		await hideReadStories(ctx, document, storyData);
		return keyboardNavigation(ctx, document, storyData, getNavState());
	},
};

/**
 * HN's DOM structure is awful. Let's clean it up early on in the page load
 * so that we don't have to hack around it. The way I've coded it up, it should work regardless
 * of them fixing it in the future.
 */
const cleanupDom = (doc: Document, bigbox: HTMLElement) => {
	// space rows are missing an inner td, which makes the formatting inconsistent for drawing a
	// nice box around them to indicate focus.
	const spaceRows = bigbox.querySelectorAll('.spacer') as NodeListOf<HTMLElement>;
	for (const space of spaceRows) {
		if (space.children.length === 0) {
			const emptyTd = doc.createElement('td');
			emptyTd.setAttribute('colspan', '3');
			space.append(emptyTd);
		}
	}

	// some stories don't have a consistent dom structure, job posts are missing a span.subline
	// element, which is odd and inconsistent.
	const subtexts = bigbox.querySelectorAll('.subtext') as NodeListOf<HTMLElement>;
	for (const subtext of subtexts) {
		if (!subtext.firstElementChild?.classList.contains('subline')) {
			const newsubline = doc.createElement('span');
			newsubline.classList.add('subline');
			newsubline.append(...subtext.childNodes);
			subtext.replaceChildren(newsubline);
		}
	}
};
