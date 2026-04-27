import { resolveHnUrl } from '@/components/common/copy-feedback.ts';
import { dom } from '@/utils/dom.ts';
import { parseReferenceLinks } from '@/utils/parse-reference-links.ts';

const COMMENTS_REGEX = /\[\s*(\d+)\s*more\s*]/;
const COLLAPSE_LABEL_REGEX = /^\[–]$/;
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
const COMMENT_AGE_LINK_SELECTOR = '.comhead .age a';

export const focusClass = 'oj_focused_comment';
export const focusClassDefault = 'oj_focused_comment_default';

const MUTED_MARKER_TEXT = ' [muted] ';
const MUTED_MARKER_STYLE_ID = 'oj-muted-marker-style';

export class HNComment {
	id: string;
	commentRow: HTMLElement;

	author?: string;
	postedDate?: string;
	mutedMarker: HTMLElement | null = null;
	private mutedMarkerInserted = false;

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
		this.ensureMutedMarkerStyle();
	}

	get commentHead(): HTMLElement | null {
		return this.commentRow.querySelector('.comhead');
	}

	get commentText(): HTMLElement | null {
		return this.commentRow.querySelector('.commtext');
	}

	getAuthor(): string | undefined {
		return this.author?.trim();
	}

	setMuted(muted: boolean): void {
		if (muted && !this.mutedMarkerInserted) {
			const authorLink = this.commentHead?.querySelector('a.hnuser');
			if (authorLink) {
				const marker = document.createElement('span');
				marker.className = 'oj_muted_marker';
				marker.textContent = MUTED_MARKER_TEXT;
				authorLink.after(marker);
				this.mutedMarker = marker;
				this.mutedMarkerInserted = true;
			}
		} else if (!muted && this.mutedMarker) {
			this.mutedMarker.remove();
			this.mutedMarker = null;
			this.mutedMarkerInserted = false;
		}
	}

	private ensureMutedMarkerStyle(): void {
		if (document.getElementById(MUTED_MARKER_STYLE_ID)) {
			return;
		}
		const style = document.createElement('style');
		style.id = MUTED_MARKER_STYLE_ID;
		style.textContent = `
			.hnuser + ${JSON.stringify(MUTED_MARKER_TEXT)} {
				color: #888;
				font-size: 0.85em;
				margin-left: 4px;
			}
		`;
		document.head.appendChild(style);
	}

	get isCollapsed(): boolean {
		return (
			this.commentRow.classList.contains('coll') ||
			this.commentRow.classList.contains('noshow')
		);
	}

	get isCollapsedRoot(): boolean {
		return this.commentRow.classList.contains('coll');
	}

	get isHiddenChild(): boolean {
		return this.commentRow.classList.contains('noshow');
	}

	get isVisibleInThread(): boolean {
		return !(this.isDead || this.isHiddenChild);
	}

	get isDead(): boolean {
		return this.commentRow.querySelector('.comhead .dead') !== null;
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

		const btn = unvoteBtn ?? voteBtn;
		if (btn) {
			btn.click();
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
		return;
	}

	collapseToggle(): boolean {
		const toggleLinks = this.commentRow.querySelectorAll<HTMLAnchorElement>('a.togg');
		for (const el of toggleLinks) {
			const trimmed = el.textContent?.trim() || '';
			const isCollapsedToggle =
				COLLAPSE_LABEL_REGEX.test(trimmed) || COMMENTS_REGEX.test(trimmed);
			if (isCollapsedToggle) {
				el.click();
				return true;
			}
		}
		return false;
	}

	getCollapseRootLink(): HTMLAnchorElement | undefined {
		const comhead = this.commentHead;
		if (!comhead) {
			return;
		}
		for (const link of comhead.querySelectorAll('a')) {
			if (link.textContent === '[collapse root]') {
				return link as HTMLAnchorElement;
			}
		}
		return;
	}

	getExpandRootLink(): HTMLAnchorElement | undefined {
		const toggleLinks = this.commentRow.querySelectorAll<HTMLAnchorElement>('a.togg');
		for (const el of toggleLinks) {
			const trimmed = el.textContent?.trim() || '';
			if (COMMENTS_REGEX.test(trimmed)) {
				return el;
			}
		}
		return;
	}

	getRootCommentElement(): HTMLElement | undefined {
		let rootRow: HTMLElement | null = null;
		let currentRow = this.commentRow.previousElementSibling as HTMLElement | null;
		while (currentRow) {
			const indent = dom.getCommentIndentation(currentRow);
			if (indent.width === 0) {
				rootRow = currentRow;
				break;
			}
			currentRow = currentRow.previousElementSibling as HTMLElement | null;
		}
		return rootRow ?? undefined;
	}

	getNextSiblingLink(): HTMLAnchorElement | undefined {
		const links = this.commentRow.querySelectorAll<HTMLAnchorElement>('a');
		for (const link of links) {
			if (link.textContent?.trim() === 'next') {
				return link;
			}
		}
		return;
	}

	getPrevSiblingLink(): HTMLAnchorElement | undefined {
		const links = this.commentRow.querySelectorAll<HTMLAnchorElement>('a');
		for (const link of links) {
			if (link.textContent?.trim() === 'prev') {
				return link;
			}
		}
		return;
	}

	getReferenceLinks() {
		const commtext = this.commentRow.querySelector('.commtext') as HTMLElement;
		if (!commtext) {
			return [];
		}
		return parseReferenceLinks(commtext);
	}

	getHnUrl(): string | undefined {
		const href = this.commentRow
			.querySelector<HTMLAnchorElement>(COMMENT_AGE_LINK_SELECTOR)
			?.getAttribute('href');
		if (!href) {
			return;
		}

		return resolveHnUrl(href);
	}

	getIndentLevel(): number {
		const indentImage = this.commentRow.querySelector<HTMLImageElement>('td.ind img');
		if (!indentImage) {
			return 0;
		}

		const dataLevel = indentImage.dataset.indentLevel;
		if (dataLevel) {
			const parsed = Number.parseInt(dataLevel, 10);
			if (!Number.isNaN(parsed)) {
				return parsed;
			}
		}

		return indentImage.width / 40;
	}

	static getCommentIdFromElement(element: HTMLElement): string | null {
		const row = element.closest<HTMLElement>(`[${COMMENT_ID_ATTR}]`);
		return row?.getAttribute(COMMENT_ID_ATTR) || null;
	}
}
