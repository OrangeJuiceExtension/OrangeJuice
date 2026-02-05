import { beforeEach, describe, expect, it, vi } from 'vitest';
import { focusClass, focusClassDefault, HNComment } from '@/components/comment/hn-comment.ts';
import { parseReferenceLinks } from '@/utils/parse-reference-links.ts';

vi.mock('@/utils/parse-reference-links.ts', () => ({
	parseReferenceLinks: vi.fn(() => []),
}));

describe('HNComment', () => {
	let doc: Document;

	beforeEach(() => {
		doc = document.implementation.createHTMLDocument();
		vi.clearAllMocks();
	});

	const createCommentRow = (options?: {
		collapsed?: boolean;
		dead?: boolean;
		author?: string;
		postedDate?: string;
	}) => {
		const row = doc.createElement('tr');
		row.id = 'comment-1';
		row.classList.add('comtr');
		if (options?.collapsed) {
			row.classList.add('coll');
		}
		if (options?.dead) {
			const comhead = doc.createElement('span');
			comhead.classList.add('comhead');
			const dead = doc.createElement('span');
			dead.classList.add('dead');
			comhead.appendChild(dead);
			row.appendChild(comhead);
		}
		if (options?.author) {
			const author = doc.createElement('a');
			author.classList.add('hnuser');
			author.textContent = options.author;
			row.appendChild(author);
		}
		if (options?.postedDate) {
			const age = doc.createElement('span');
			age.classList.add('age');
			age.setAttribute('title', options.postedDate);
			row.appendChild(age);
		}
		const defaultCell = doc.createElement('td');
		defaultCell.classList.add('default');
		row.appendChild(defaultCell);
		doc.body.appendChild(row);
		return row;
	};

	describe('parse', () => {
		it('should parse author and posted date', () => {
			const row = createCommentRow({ author: 'alice', postedDate: '2024-01-01' });

			const comment = new HNComment(row);

			expect(comment.author).toBe('alice');
			expect(comment.postedDate).toBe('2024-01-01');
		});

		it('should mark collapsed when coll or noshow class exists', () => {
			const row = createCommentRow({ collapsed: true });

			const comment = new HNComment(row);

			expect(comment.isCollapsed).toBe(true);
		});

		it('should mark dead when .comhead .dead exists', () => {
			const row = createCommentRow({ dead: true });

			const comment = new HNComment(row);

			expect(comment.isDead).toBe(true);
		});

		it('should set data-comment-id attribute', () => {
			const row = createCommentRow();

			new HNComment(row);

			expect(row.getAttribute('data-comment-id')).toBe('comment-1');
		});
	});

	describe('hidden', () => {
		it('should be hidden when collapsed', () => {
			const row = createCommentRow({ collapsed: true });

			const comment = new HNComment(row);

			expect(comment.hidden()).toBe(true);
		});

		it('should be hidden when dead', () => {
			const row = createCommentRow({ dead: true });

			const comment = new HNComment(row);

			expect(comment.hidden()).toBe(true);
		});
	});

	describe('activation', () => {
		it('should add focus classes on activate', () => {
			const row = createCommentRow();
			const comment = new HNComment(row);

			comment.activate();

			expect(row.classList.contains(focusClass)).toBe(true);
			expect(row.querySelector('td.default')?.classList.contains(focusClassDefault)).toBe(
				true
			);
		});

		it('should remove focus classes on deactivate', () => {
			const row = createCommentRow();
			const comment = new HNComment(row);
			comment.activate();

			comment.deactivate();

			expect(row.classList.contains(focusClass)).toBe(false);
			expect(row.querySelector('td.default')?.classList.contains(focusClassDefault)).toBe(
				false
			);
		});
	});

	describe('events', () => {
		it('should proxy addEventListener/removeEventListener', () => {
			const row = createCommentRow();
			const comment = new HNComment(row);
			const handler = vi.fn();
			const addSpy = vi.spyOn(row, 'addEventListener');
			const removeSpy = vi.spyOn(row, 'removeEventListener');

			comment.addEventListener('click', handler);
			comment.removeEventListener('click', handler);

			expect(addSpy).toHaveBeenCalledWith('click', handler, undefined);
			expect(removeSpy).toHaveBeenCalledWith('click', handler, undefined);
		});
	});

	describe('toggleVote', () => {
		it('should click unvote when present', () => {
			const row = createCommentRow();
			const unvote = doc.createElement('a');
			unvote.id = 'un_123';
			row.appendChild(unvote);
			const clickSpy = vi.spyOn(unvote, 'click');
			const comment = new HNComment(row);

			const result = comment.toggleVote('upvote');

			expect(result).toBe(true);
			expect(clickSpy).toHaveBeenCalled();
		});

		it('should click vote arrow when present', () => {
			const row = createCommentRow();
			const arrow = doc.createElement('div');
			arrow.classList.add('votearrow');
			arrow.title = 'upvote';
			row.appendChild(arrow);
			const clickSpy = vi.spyOn(arrow, 'click');
			const comment = new HNComment(row);

			const result = comment.toggleVote('upvote');

			expect(result).toBe(true);
			expect(clickSpy).toHaveBeenCalled();
		});

		it('should click downvote arrow when present', () => {
			const row = createCommentRow();
			const arrow = doc.createElement('div');
			arrow.classList.add('votearrow');
			arrow.title = 'downvote';
			row.appendChild(arrow);
			const clickSpy = vi.spyOn(arrow, 'click');
			const comment = new HNComment(row);

			const result = comment.toggleVote('downvote');

			expect(result).toBe(true);
			expect(clickSpy).toHaveBeenCalled();
		});

		it('should return false when no vote elements exist', () => {
			const row = createCommentRow();
			const comment = new HNComment(row);

			const result = comment.toggleVote('downvote');

			expect(result).toBe(false);
		});
	});

	describe('favorite/flag/reply', () => {
		it('should click favorite when present', () => {
			const row = createCommentRow();
			const fav = doc.createElement('button');
			fav.classList.add('oj_favorite_link');
			row.appendChild(fav);
			const clickSpy = vi.spyOn(fav, 'click');
			const comment = new HNComment(row);

			const result = comment.favorite();

			expect(result).toBe(true);
			expect(clickSpy).toHaveBeenCalled();
		});

		it('should click flag when present', () => {
			const row = createCommentRow();
			const flag = doc.createElement('a');
			flag.classList.add('oj_flag_link');
			row.appendChild(flag);
			const clickSpy = vi.spyOn(flag, 'click');
			const comment = new HNComment(row);

			const result = comment.flag();

			expect(result).toBe(true);
			expect(clickSpy).toHaveBeenCalled();
		});

		it('should click reply when present', () => {
			const row = createCommentRow();
			const reply = doc.createElement('a');
			reply.setAttribute('href', 'reply?id=123');
			row.appendChild(reply);
			const clickSpy = vi.spyOn(reply, 'click');
			const comment = new HNComment(row);

			const result = comment.reply();

			expect(result).toBe(reply);
			expect(clickSpy).toHaveBeenCalled();
		});
	});

	describe('collapseToggle', () => {
		it('should click collapse link with [–]', () => {
			const row = createCommentRow();
			const toggle = doc.createElement('a');
			toggle.classList.add('togg', 'clicky');
			toggle.textContent = '[–]';
			row.appendChild(toggle);
			const clickSpy = vi.spyOn(toggle, 'click');
			const comment = new HNComment(row);

			const result = comment.collapseToggle();

			expect(result).toBe(true);
			expect(clickSpy).toHaveBeenCalled();
		});

		it('should click collapse link with [N more]', () => {
			const row = createCommentRow();
			const toggle = doc.createElement('a');
			toggle.classList.add('togg', 'clicky');
			toggle.textContent = '[2 more]';
			row.appendChild(toggle);
			const clickSpy = vi.spyOn(toggle, 'click');
			const comment = new HNComment(row);

			const result = comment.collapseToggle();

			expect(result).toBe(true);
			expect(clickSpy).toHaveBeenCalled();
		});
	});

	describe('sibling links', () => {
		it('should find next link', () => {
			const row = createCommentRow();
			const next = doc.createElement('a');
			next.textContent = 'next';
			row.appendChild(next);
			const comment = new HNComment(row);

			expect(comment.getNextSiblingLink()).toBe(next);
		});

		it('should find prev link', () => {
			const row = createCommentRow();
			const prev = doc.createElement('a');
			prev.textContent = 'prev';
			row.appendChild(prev);
			const comment = new HNComment(row);

			expect(comment.getPrevSiblingLink()).toBe(prev);
		});
	});

	describe('reference links', () => {
		it('should parse reference links when commtext exists', () => {
			const row = createCommentRow();
			const commtext = doc.createElement('span');
			commtext.classList.add('commtext');
			row.appendChild(commtext);
			const comment = new HNComment(row);

			vi.mocked(parseReferenceLinks).mockReturnValue([
				{ index: 1, href: 'https://example.com' },
			]);

			const links = comment.getReferenceLinks();

			expect(parseReferenceLinks).toHaveBeenCalledWith(commtext);
			expect(links).toEqual([{ index: 1, href: 'https://example.com' }]);
		});

		it('should return empty array when no commtext', () => {
			const row = createCommentRow();
			const comment = new HNComment(row);

			expect(comment.getReferenceLinks()).toEqual([]);
		});
	});

	describe('getCommentIdFromElement', () => {
		it('should return comment id from nested element', () => {
			const row = createCommentRow();
			new HNComment(row);
			const inner = doc.createElement('span');
			row.appendChild(inner);

			expect(HNComment.getCommentIdFromElement(inner)).toBe('comment-1');
		});
	});
});
