import type { Browser } from '#imports';
import { STORY_HIDDEN } from '@/components/story/hide-read-stories.ts';
import { focusClass1, focusClass2, focusClass3 } from '@/components/story/story-data.ts';
import { paths } from '@/utils/paths.ts';

const POINTS_REGEX = /^(\d+)\s+points?$/;
const COMMENTS_REGEX = /^(\d+)\s+comments?$/;
const UNVOTE_LINK = 'a[id^="un_"]';
const UPVOTE_ARROW = 'div.votearrow[title="upvote"]';
const FAVORITE_LINK = 'button.oj_favorite_link';
const FLAG_LINK = 'a[href^="flag?"]';
const STORY_ID_ATTR = 'data-story-id';

export class HNStory {
	id: string;

	// A "story" is actually 3 TD elements. We always have a spacerRow with a td, because I fix that in index.ts.
	// As such, not only do we have to track all 3, but we need to add event listeners to all 3.
	// I have to believe that this is because someone truly hates the internet.
	storyRow: HTMLElement;
	subtextRow?: HTMLElement;
	spacerRow?: HTMLElement;

	position?: number;
	title?: string;
	url?: string;
	commentsUrl?: string;
	points?: number;
	author?: string;
	postedDate?: string;
	commentsCount?: number;
	latestVisit?: Browser.history.VisitItem;
	private isHidden = false;

	constructor(storyRow: HTMLElement) {
		this.id = storyRow.id;
		this.storyRow = storyRow;
		this.subtextRow = this.storyRow.nextElementSibling as HTMLElement;
		this.spacerRow = this.subtextRow?.nextElementSibling as HTMLElement;

		this.storyRow.setAttribute(STORY_ID_ATTR, this.id);
		this.subtextRow?.setAttribute(STORY_ID_ATTR, this.id);
		this.spacerRow?.setAttribute(STORY_ID_ATTR, this.id);

		this.parse();
	}

	parse() {
		const { title, url } = this.parseTitle(this.storyRow);

		this.id = this.storyRow.id;
		this.title = title;
		this.url = url;
		this.position = this.parsePosition(this.storyRow);
		this.commentsUrl = `${paths.base}/item?id=${this.id}`;

		this.points = this.parsePoints(this.subtextRow);
		this.author = this.subtextRow?.querySelector('a.hnuser')?.textContent;
		this.postedDate =
			this.subtextRow?.querySelector('span.age')?.getAttribute('title') || undefined;
		this.commentsCount = this.parseComments(this.subtextRow);
	}

	parsePosition(row: HTMLElement): number {
		const rankText = row.querySelector('span.rank')?.textContent?.replace('.', '') || '0';
		return Number.parseInt(rankText, 10);
	}

	parseTitle(row: HTMLElement): { title: string; url: string } {
		const titleLink = row.querySelector<HTMLAnchorElement>('span.titleline > a');
		const href = titleLink?.getAttribute('href') || '';
		const url = href.length === 0 || href.startsWith('http') ? href : `${paths.base}/${href}`;
		return {
			title: titleLink?.textContent || '',
			url,
		};
	}

	parsePoints(subtext?: HTMLElement): number | undefined {
		if (!subtext) {
			return undefined;
		}
		const scoreText = subtext.querySelector('span.score')?.textContent;
		const match = scoreText?.match(POINTS_REGEX);
		return match ? Number.parseInt(match[1], 10) : undefined;
	}

	parseComments(subtext?: HTMLElement): number | undefined {
		if (!subtext) {
			return undefined;
		}
		const links = subtext.querySelectorAll<HTMLAnchorElement>('a');

		for (const link of links) {
			const href = link.getAttribute('href');
			if (!href?.startsWith('item?id=')) {
				continue;
			}

			const text = link.textContent;
			if (text === 'discuss') {
				return 0;
			}

			const match = text?.match(COMMENTS_REGEX);
			if (match) {
				return Number.parseInt(match[1], 10);
			}
		}

		return undefined;
	}

	hide() {
		this.isHidden = true;
		this.storyRow.style.display = 'none';
		if (this.subtextRow) {
			this.subtextRow.style.display = 'none';
		}
		if (this.spacerRow) {
			this.spacerRow.style.display = 'none';
		}
		this.storyRow.classList.add(STORY_HIDDEN);
	}

	show() {
		this.isHidden = false;
		this.storyRow.style.display = '';
		if (this.subtextRow) {
			this.subtextRow.style.display = '';
		}
		if (this.spacerRow) {
			this.spacerRow.style.display = '';
		}
		this.storyRow.classList.remove(STORY_HIDDEN);
	}

	hidden(): boolean {
		return this.isHidden;
	}

	activate() {
		this.deactivate();
		this.storyRow.classList.add(focusClass1);
		this.subtextRow?.classList.add(focusClass2);
		this.spacerRow?.classList.add(focusClass3);
	}

	deactivate() {
		this.storyRow.classList.remove(focusClass1);
		this.subtextRow?.classList.remove(focusClass2);
		this.spacerRow?.classList.remove(focusClass3);
	}

	addEventListener<K extends keyof HTMLElementEventMap>(
		type: K,
		listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void
	): void {
		const elements = [this.storyRow, this.subtextRow, this.spacerRow].filter(
			(el): el is HTMLElement => el !== undefined
		);

		for (const element of elements) {
			element.addEventListener(type, listener);
		}
	}

	removeEventListener<K extends keyof HTMLElementEventMap>(
		type: K,
		listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void
	): void {
		const elements = [this.storyRow, this.subtextRow, this.spacerRow].filter(
			(el): el is HTMLElement => el !== undefined
		);

		for (const element of elements) {
			element.removeEventListener(type, listener);
		}
	}

	toggleVote(): boolean {
		const unvoteBtn = this.subtextRow?.querySelector(UNVOTE_LINK) as HTMLAnchorElement;
		if (unvoteBtn) {
			unvoteBtn.click();
			return true;
		}

		const voteBtn = this.storyRow?.querySelector(UPVOTE_ARROW) as HTMLDivElement;
		if (voteBtn) {
			(voteBtn.parentElement as HTMLAnchorElement).click();
			return true;
		}

		return false;
	}

	favorite(): boolean {
		const fave = this.subtextRow?.querySelector(FAVORITE_LINK) as HTMLAnchorElement;
		if (fave) {
			fave.click();
			return true;
		}
		return false;
	}

	flag(): boolean {
		const flagLink = this.subtextRow?.querySelector(FLAG_LINK) as HTMLAnchorElement;
		if (flagLink) {
			flagLink.click();
			return true;
		}
		return false;
	}

	static getStoryIdFromElement(element: HTMLElement): string | null {
		const row = element.closest<HTMLElement>(`[${STORY_ID_ATTR}]`);
		return row?.getAttribute(STORY_ID_ATTR) || null;
	}
}
