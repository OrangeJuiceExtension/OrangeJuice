import type { HNComment } from '@/components/comment/hn-comment.ts';
import { dom } from '@/utils/dom.ts';
import { IndexedList } from '@/utils/indexed-list.ts';
import lStorage from '@/utils/local-storage.ts';

const ACTIVE_COMMENT_KEY = 'oj_active_comment_id';
const NAV_STATE_KEY = 'oj_comment_nav_state';

type NavDirection = 'next' | 'prev';
type ActiveCommentMap = Record<string, { commentId: string }>;

export class CommentData {
	private readonly comments: IndexedList<HNComment>;
	private activeComment?: HNComment;
	replyButton?: HTMLElement;

	constructor(comments: HNComment[]) {
		this.comments = new IndexedList(comments, (comment) => comment.id);
	}

	get(id: string): HNComment | undefined {
		return this.comments.get(id);
	}

	getCommentFromElement(element: HTMLElement): HNComment | undefined {
		const commentRow = element.closest('tr.athing') as HTMLElement;
		if (!commentRow?.id) {
			return undefined;
		}
		return this.comments.get(commentRow.id);
	}

	getActiveComment(): HNComment | undefined {
		return this.activeComment;
	}

	async activate(comment: HNComment): Promise<void> {
		await this.deactivate();
		this.activeComment = comment;
		comment.activate();
		await this.storeActiveCommentId(comment.id);
	}

	async deactivate(): Promise<void> {
		this.deactivateActiveComment();
		await this.clearStoredActiveCommentId();
	}

	private deactivateActiveComment(): void {
		if (this.activeComment) {
			this.activeComment.deactivate();
			this.activeComment = undefined;
		}
	}

	private hasChildren(comment: HNComment): boolean {
		const next = this.comments.getNext(comment);
		if (!next) {
			return false;
		}
		return next.getIndentLevel() > comment.getIndentLevel();
	}

	private getNextAfterCollapsedSubtree(
		comment: HNComment,
		skipHidden: boolean
	): HNComment | undefined {
		const baseIndent = comment.getIndentLevel();
		let current = this.comments.getNext(comment);
		while (current) {
			if (current.getIndentLevel() <= baseIndent) {
				if (skipHidden && current.hidden()) {
					return this.getNext(current, skipHidden);
				}
				return current;
			}
			current = this.comments.getNext(current);
		}
		return undefined;
	}

	getNext(comment: HNComment, skipHidden = true): HNComment | undefined {
		const next = this.comments.getNext(comment);
		if (!next) {
			return undefined;
		}
		if (skipHidden) {
			if (next.isCollapsed && this.hasChildren(next)) {
				return this.getNextAfterCollapsedSubtree(next, skipHidden);
			}
			if (next.hidden()) {
				return this.getNext(next, skipHidden);
			}
		}
		return next;
	}

	getPrevious(comment: HNComment, skipHidden = true): HNComment | undefined {
		const prev = this.comments.getPrevious(comment);
		if (!prev) {
			return undefined;
		}
		if (skipHidden && prev.hidden()) {
			return this.getPrevious(prev, skipHidden);
		}
		return prev;
	}

	first(): HNComment | undefined {
		return this.comments.first();
	}

	last(): HNComment | undefined {
		return this.comments.last();
	}

	findClosestCollapsed(direction: 'up' | 'down'): HNComment | undefined {
		if (!this.activeComment) {
			return undefined;
		}

		let current = this.activeComment;
		while (current) {
			const next =
				direction === 'up'
					? this.comments.getPrevious(current)
					: this.comments.getNext(current);
			if (!next) {
				return undefined;
			}
			if (next.hidden()) {
				return next;
			}
			current = next;
		}

		return undefined;
	}

	closestCollapsedUp(): HNComment | undefined {
		return this.findClosestCollapsed('up');
	}

	closestCollapsedDown(): HNComment | undefined {
		return this.findClosestCollapsed('down');
	}

	favorite() {
		this.activeComment?.favorite();
	}

	flag() {
		this.activeComment?.flag();
	}

	toggleVote(voteType: 'upvote' | 'downvote') {
		this.activeComment?.toggleVote(voteType);
	}

	reply() {
		return this.activeComment?.reply();
	}

	collapseToggle() {
		this.activeComment?.collapseToggle();
	}

	addEventListener<K extends keyof HTMLElementEventMap>(
		type: K,
		listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void
	): void {
		for (const comment of this.comments) {
			comment.addEventListener(type, listener);
		}
	}

	removeEventListener<K extends keyof HTMLElementEventMap>(
		type: K,
		listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void
	): void {
		for (const comment of this.comments) {
			comment.removeEventListener(type, listener);
		}
	}

	private getItemId(): string | null {
		return dom.getItemIdFromLocation();
	}

	async getStoredActiveCommentId(): Promise<string | undefined> {
		const itemId = this.getItemId();
		if (!itemId) {
			return;
		}
		const stored = await lStorage.getItem<ActiveCommentMap>(ACTIVE_COMMENT_KEY);
		const commentId = stored?.[itemId]?.commentId;
		if (commentId) {
			const nextStored: ActiveCommentMap = { ...(stored ?? {}), [itemId]: { commentId } };
			await lStorage.setItem(ACTIVE_COMMENT_KEY, nextStored);
			return commentId;
		}
	}

	async storeActiveCommentId(commentId: string): Promise<void> {
		const itemId = this.getItemId();
		if (!itemId) {
			return;
		}
		const stored = await lStorage.getItem<ActiveCommentMap>(ACTIVE_COMMENT_KEY);
		const nextStored: ActiveCommentMap = { ...(stored ?? {}), [itemId]: { commentId } };
		await lStorage.setItem(ACTIVE_COMMENT_KEY, nextStored);
	}

	async clearStoredActiveCommentId(): Promise<void> {
		const itemId = this.getItemId();
		if (!itemId) {
			return;
		}
		const stored = await lStorage.getItem<ActiveCommentMap>(ACTIVE_COMMENT_KEY);
		if (!stored?.[itemId]) {
			return;
		}
		const nextStored: ActiveCommentMap = { ...stored };
		delete nextStored[itemId];
		await lStorage.setItem(ACTIVE_COMMENT_KEY, nextStored);
	}

	async getNavState(): Promise<NavDirection | null> {
		return (await lStorage.getItem<NavDirection>(NAV_STATE_KEY)) ?? null;
	}

	async setNavState(direction: NavDirection): Promise<void> {
		await lStorage.setItem(NAV_STATE_KEY, direction);
	}

	async clearNavState(): Promise<void> {
		await lStorage.setItem(NAV_STATE_KEY, null);
	}
}
