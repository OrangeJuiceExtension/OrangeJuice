import type { HNComment } from '@/components/comment/hn-comment.ts';
import { IndexedList } from '@/utils/indexed-list.ts';

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

	activate(comment: HNComment) {
		this.deactivate();
		this.activeComment = comment;
		comment.activate();
	}

	deactivate() {
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
}
