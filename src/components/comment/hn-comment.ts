import { parseReferenceLinks } from '@/utils/parse-reference-links.ts';

const COMMENTS_REGEX = /\[\s*(\d+)\s*more\s*]/;
const VOTE_SELECTORS = {
	UNVOTE_LINK: 'a[id^="un_"]',
	UPVOTE_ARROW: 'div.votearrow[title="upvote"]',
	DOWNVOTE_ARROW: 'div.votearrow[title="downvote"]',
} as const;
const FAVORITE_LINK = '.oj_favorite_link';
const FLAG_LINK_1 = '.oj_flag_link';
const FLAG_LINK_2 = 'a[href*="flag"]';
const REPLY_LINK = 'a[href^="reply"]';
const COMMENT_ID_ATTR = 'data-comment-id';

export const focusClass = 'oj_focused_comment';
export const focusClassDefault = 'oj_focused_comment_default';

export class HNComment {
	id: string;
	commentRow: HTMLElement;

	author?: string;
	postedDate?: string;
	isCollapsed = false;
	isDead = false;

	constructor(commentRow: HTMLElement) {
		this.id = commentRow.id;
		this.commentRow = commentRow;
		this.commentRow.setAttribute(COMMENT_ID_ATTR, this.id);
		this.parse();
	}

	parse() {
		this.author = this.commentRow.querySelector('a.hnuser')?.textContent || undefined;
		this.postedDate =
			this.commentRow.querySelector('span.age')?.getAttribute('title') || undefined;
		this.isCollapsed =
			this.commentRow.classList.contains('coll') ||
			this.commentRow.classList.contains('noshow');
		this.isDead = this.commentRow.querySelector('.comhead .dead') !== null;
	}

	hidden(): boolean {
		return this.isCollapsed || this.isDead;
	}

	activate() {
		this.deactivate();
		this.commentRow.classList.add(focusClass);
		const defaultCell = this.commentRow.querySelector('td.default');
		defaultCell?.classList.add(focusClassDefault);
	}

	deactivate() {
		this.commentRow.classList.remove(focusClass);
		const defaultCell = this.commentRow.querySelector('td.default');
		defaultCell?.classList.remove(focusClassDefault);
	}

	addEventListener<K extends keyof HTMLElementEventMap>(
		type: K,
		listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions
	): void {
		this.commentRow.addEventListener(type, listener, options);
	}

	removeEventListener<K extends keyof HTMLElementEventMap>(
		type: K,
		listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void,
		options?: boolean | AddEventListenerOptions
	): void {
		this.commentRow.removeEventListener(type, listener, options);
	}

	toggleVote(voteType: 'upvote' | 'downvote'): boolean {
		const voteBtn = this.commentRow.querySelector(
			voteType === 'upvote' ? VOTE_SELECTORS.UPVOTE_ARROW : VOTE_SELECTORS.DOWNVOTE_ARROW
		) as HTMLDivElement;
		const unvoteBtn = this.commentRow.querySelector(
			VOTE_SELECTORS.UNVOTE_LINK
		) as HTMLAnchorElement;

		if (unvoteBtn) {
			unvoteBtn.click();
			return true;
		}

		if (voteBtn) {
			voteBtn.click();
			return true;
		}

		return false;
	}

	favorite(): boolean {
		const fave = this.commentRow.querySelector(FAVORITE_LINK) as HTMLAnchorElement;
		if (fave) {
			fave.click();
			return true;
		}
		return false;
	}

	flag(): boolean {
		const flagLink = this.commentRow.querySelector<HTMLAnchorElement>(
			`${FLAG_LINK_1}, ${FLAG_LINK_2}`
		);
		if (flagLink) {
			flagLink.click();
			return true;
		}
		return false;
	}

	reply(): HTMLElement | undefined {
		const replyBtn = this.commentRow.querySelector(REPLY_LINK) as HTMLAnchorElement;
		if (replyBtn) {
			replyBtn.click();
			return replyBtn;
		}
		return undefined;
	}

	collapseToggle(): boolean {
		const toggleLinks = this.commentRow.querySelectorAll<HTMLAnchorElement>('a.togg.clicky');
		for (const el of toggleLinks) {
			const trimmed = el.textContent?.trim() || '';
			const isCollapsed = COMMENTS_REGEX.test(trimmed);
			if (trimmed === '[–]' || isCollapsed) {
				el.click();
				return true;
			}
		}
		return false;
	}

	getNextSiblingLink(): HTMLAnchorElement | undefined {
		const links = this.commentRow.querySelectorAll<HTMLAnchorElement>('a');
		for (const link of links) {
			if (link.textContent?.trim() === 'next') {
				return link;
			}
		}
		return undefined;
	}

	getPrevSiblingLink(): HTMLAnchorElement | undefined {
		const links = this.commentRow.querySelectorAll<HTMLAnchorElement>('a');
		for (const link of links) {
			if (link.textContent?.trim() === 'prev') {
				return link;
			}
		}
		return undefined;
	}

	getReferenceLinks() {
		const commtext = this.commentRow.querySelector('.commtext') as HTMLElement;
		if (!commtext) {
			return [];
		}
		return parseReferenceLinks(commtext);
	}

	static getCommentIdFromElement(element: HTMLElement): string | null {
		const row = element.closest<HTMLElement>(`[${COMMENT_ID_ATTR}]`);
		return row?.getAttribute(COMMENT_ID_ATTR) || null;
	}
}
