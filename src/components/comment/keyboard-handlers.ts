import type { CommentData } from '@/components/comment/comment-data.ts';
import type { HNComment } from '@/components/comment/hn-comment.ts';
import { createClientServices } from '@/services/manager.ts';
import { dom } from '@/utils/dom.ts';
import lStorage from '@/utils/localStorage.ts';

const ACTIVE_COMMENT_KEY = 'oj_active_comment_id';
const NAV_STATE_KEY = 'oj_comment_nav_state';
const NEXT_PARAM_REGEX = /[?&]next=/;

type NavDirection = 'next' | 'prev';

type ActiveCommentMap = Record<string, { commentId: string }>;

export class KeyboardHandlers {
	private readonly doc: Document;

	constructor(doc: Document) {
		this.doc = doc;
	}

	private getItemId(): string | null {
		return dom.getItemIdFromLocation();
	}

	private async getStoredActiveCommentId(itemId: string): Promise<string | null> {
		const stored = await lStorage.getItem<ActiveCommentMap>(ACTIVE_COMMENT_KEY);
		const commentId = stored?.[itemId]?.commentId;
		if (commentId) {
			return commentId;
		}
		const legacy = await lStorage.getItem<string>(`${ACTIVE_COMMENT_KEY}:${itemId}`);
		if (!legacy) {
			return null;
		}
		const nextStored: ActiveCommentMap = { ...(stored ?? {}), [itemId]: { commentId: legacy } };
		await lStorage.setItem(ACTIVE_COMMENT_KEY, nextStored);
		return legacy;
	}

	private async setStoredActiveCommentId(itemId: string, commentId: string): Promise<void> {
		const stored = await lStorage.getItem<ActiveCommentMap>(ACTIVE_COMMENT_KEY);
		const nextStored: ActiveCommentMap = { ...(stored ?? {}), [itemId]: { commentId } };
		await lStorage.setItem(ACTIVE_COMMENT_KEY, nextStored);
	}

	private async removeStoredActiveCommentId(itemId: string): Promise<void> {
		const stored = await lStorage.getItem<ActiveCommentMap>(ACTIVE_COMMENT_KEY);
		if (!stored?.[itemId]) {
			return;
		}
		const nextStored: ActiveCommentMap = { ...stored };
		delete nextStored[itemId];
		await lStorage.setItem(ACTIVE_COMMENT_KEY, nextStored);
	}

	async move(event: KeyboardEvent, commentData: CommentData, direction: 'up' | 'down') {
		const skipHidden = !event.shiftKey;

		if (!commentData.getActiveComment()) {
			await this.activateFirstItem(commentData, skipHidden);
			return;
		}

		const nextItem = this.getNextItem(commentData, direction, skipHidden);
		if (!nextItem) {
			if (direction === 'down') {
				await lStorage.setItem(NAV_STATE_KEY, 'next');
				this.clickMore();
			} else if (direction === 'up' && this.hasNextParam()) {
				await lStorage.setItem(NAV_STATE_KEY, 'prev');
				window.history.back();
			}
			return;
		}

		if (!skipHidden && nextItem.hidden()) {
			this.expandParentIfNeeded(commentData, nextItem);
		}

		await this.activateComment(commentData, nextItem);

		if (!skipHidden && nextItem.isCollapsed) {
			nextItem.collapseToggle();
		}

		this.handleScrolling(commentData, nextItem, direction);
	}

	async activateFirstItem(commentData: CommentData, skipHidden: boolean) {
		const first = commentData.first();
		if (!first) {
			return;
		}

		const itemToActivate =
			first.hidden() && skipHidden ? commentData.getNext(first, skipHidden) : first;

		if (itemToActivate) {
			await this.activateComment(commentData, itemToActivate);
		}
	}

	getNextItem(commentData: CommentData, direction: 'up' | 'down', skipHidden: boolean) {
		const activeComment = commentData.getActiveComment();
		if (!activeComment) {
			return undefined;
		}

		return direction === 'down'
			? commentData.getNext(activeComment, skipHidden)
			: commentData.getPrevious(activeComment, skipHidden);
	}

	handleCollapsedToggle(commentData: CommentData, direction: 'up' | 'down') {
		const closest =
			direction === 'up'
				? commentData.closestCollapsedUp()
				: commentData.closestCollapsedDown();

		if (closest) {
			closest.collapseToggle();
		}
	}

	handleScrolling(commentData: CommentData, nextItem: HNComment, direction: 'up' | 'down') {
		const activeComment = commentData.getActiveComment();
		if (!dom.elementInScrollView(nextItem.commentRow) && activeComment) {
			activeComment.commentRow.scrollIntoView(true);
		}

		if (direction === 'up' && nextItem === commentData.first()) {
			this.doc.body.scrollTo(0, 0);
		}
	}

	private clickMore() {
		const moreLink = this.doc.querySelector<HTMLAnchorElement>('a.morelink');
		moreLink?.click();
	}

	async escape(commentData: CommentData) {
		(this.doc.activeElement as HTMLElement)?.blur();
		commentData.deactivate();
		const itemId = this.getItemId();
		if (itemId) {
			await this.removeStoredActiveCommentId(itemId);
		}
	}

	async activateComment(commentData: CommentData, comment: HNComment) {
		commentData.activate(comment);
		const itemId = this.getItemId();
		if (itemId) {
			await this.setStoredActiveCommentId(itemId, comment.id);
		}
	}

	async activateElement(commentData: CommentData, toActivate: HTMLElement) {
		const comment = commentData.getCommentFromElement(toActivate);
		if (comment) {
			await this.activateComment(commentData, comment);
		}
	}

	openReferenceLink(event: KeyboardEvent, commentData: CommentData) {
		const activeComment = commentData.getActiveComment();
		if (!activeComment) {
			return Promise.resolve();
		}

		const targetIndex = Number.parseInt(event.key, 10);
		if (Number.isNaN(targetIndex)) {
			return Promise.resolve();
		}
		const links = activeComment.getReferenceLinks();

		const link = links.find((obj) => obj.index === targetIndex);
		if (!link) {
			return Promise.resolve();
		}

		return createClientServices()
			.getBrowserTabService()
			.createTab({ url: link.href, active: dom.isComboKey(event) });
	}

	reply(commentData: CommentData) {
		return commentData.reply();
	}

	favorite(commentData: CommentData) {
		commentData.favorite();
	}

	flag(commentData: CommentData) {
		commentData.flag();
	}

	collapseToggle(commentData: CommentData) {
		commentData.collapseToggle();
	}

	async navigateToThreadLink(commentData: CommentData, linkText: 'next' | 'prev') {
		const activeComment = commentData.getActiveComment();
		if (!activeComment) {
			return;
		}

		const link =
			linkText === 'next'
				? activeComment.getNextSiblingLink()
				: activeComment.getPrevSiblingLink();

		if (link) {
			link.click();
			const targetId = link.href.split('#')[1];
			const targetComment = commentData.get(targetId);
			if (targetComment) {
				await this.activateComment(commentData, targetComment);
			}
		} else if (linkText === 'prev') {
			this.doc.body.scrollTo(0, 0);
			const first = commentData.first();
			if (first) {
				await this.activateComment(commentData, first);
			}
		}
	}

	async next(commentData: CommentData) {
		await this.navigateToThreadLink(commentData, 'next');
	}

	async previous(commentData: CommentData) {
		await this.navigateToThreadLink(commentData, 'prev');
	}

	upvote(commentData: CommentData) {
		commentData.toggleVote('upvote');
	}

	downvote(commentData: CommentData) {
		commentData.toggleVote('downvote');
	}

	async checkActiveState(commentData: CommentData): Promise<void> {
		const navState = await lStorage.getItem<NavDirection>(NAV_STATE_KEY);
		if (navState === 'next') {
			const first = commentData.first();
			if (first && !first.hidden()) {
				await this.activateComment(commentData, first);
				await this.clearNavState();
				return;
			}
		} else if (navState === 'prev') {
			const last = this.getLastVisible(commentData);
			if (last) {
				await this.activateComment(commentData, last);
				await this.clearNavState();
				return;
			}
		}

		const itemId = this.getItemId();
		if (!itemId) {
			if (navState) {
				await this.clearNavState();
			}
			return;
		}
		const activeCommentId = await this.getStoredActiveCommentId(itemId);
		if (activeCommentId) {
			const comment = commentData.get(activeCommentId);
			if (comment && !comment.hidden()) {
				await this.activateComment(commentData, comment);
				if (navState) {
					await this.clearNavState();
				}
			}
		}
	}

	private async clearNavState(): Promise<void> {
		await lStorage.setItem(NAV_STATE_KEY, null);
	}

	private hasNextParam(): boolean {
		return NEXT_PARAM_REGEX.test(window.location.search);
	}

	private getLastVisible(commentData: CommentData): HNComment | undefined {
		let current = commentData.last();
		while (current) {
			if (current.isVisibleInThread) {
				return current;
			}
			current = commentData.getPrevious(current, false);
		}
		return undefined;
	}

	private expandParentIfNeeded(commentData: CommentData, target: HNComment): void {
		let targetIndent = target.getIndentLevel();
		let current = commentData.getPrevious(target, false);
		while (current) {
			const currentIndent = current.getIndentLevel();
			if (currentIndent < targetIndent) {
				targetIndent = currentIndent;
				if (current.isCollapsedRoot) {
					current.collapseToggle();
					return;
				}
			}
			current = commentData.getPrevious(current, false);
		}
	}
}
