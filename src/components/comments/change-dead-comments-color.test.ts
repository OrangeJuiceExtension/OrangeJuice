import { describe, expect, it } from 'vitest';
import { changeDeadCommentsColor } from './change-dead-comments-color.ts';

describe('change-dead-comments-color', () => {
	it('should add style element to document head', () => {
		const doc = document.implementation.createHTMLDocument();
		const comments: Element[] = [];

		changeDeadCommentsColor(doc, comments);

		const styleElement = doc.head.querySelector('style');
		expect(styleElement).not.toBeNull();
		expect(styleElement?.textContent).toContain('.oj_dead_comment');
		expect(styleElement?.textContent).toContain('#d89899');
	});

	it('should add class to comments marked as [dead]', () => {
		const doc = document.implementation.createHTMLDocument();
		const comment = doc.createElement('div');
		comment.innerHTML = `
			<span class="comhead">user [dead]</span>
			<div class="comment">
				<span class="commtext cdd">This is a dead comment</span>
			</div>
		`;

		changeDeadCommentsColor(doc, [comment]);

		const commtext = comment.querySelector('div.comment span.commtext.cdd');
		expect(commtext?.classList.contains('oj_dead_comment')).toBe(true);
	});

	it('should not add class to comments without [dead] marker', () => {
		const doc = document.implementation.createHTMLDocument();
		const comment = doc.createElement('div');
		comment.innerHTML = `
			<span class="comhead">user</span>
			<div class="comment">
				<span class="commtext cdd">This is a live comment</span>
			</div>
		`;

		changeDeadCommentsColor(doc, [comment]);

		const commtext = comment.querySelector('div.comment span.commtext.cdd');
		expect(commtext?.classList.contains('oj_dead_comment')).toBe(false);
	});

	it('should handle multiple comments', () => {
		const doc = document.implementation.createHTMLDocument();

		const deadComment = doc.createElement('div');
		deadComment.innerHTML = `
			<span class="comhead">user1 [dead]</span>
			<div class="comment">
				<span class="commtext cdd">Dead comment</span>
			</div>
		`;

		const liveComment = doc.createElement('div');
		liveComment.innerHTML = `
			<span class="comhead">user2</span>
			<div class="comment">
				<span class="commtext cdd">Live comment</span>
			</div>
		`;

		const anotherDeadComment = doc.createElement('div');
		anotherDeadComment.innerHTML = `
			<span class="comhead">user3 [dead]</span>
			<div class="comment">
				<span class="commtext cdd">Another dead comment</span>
			</div>
		`;

		changeDeadCommentsColor(doc, [deadComment, liveComment, anotherDeadComment]);

		const deadCommtext1 = deadComment.querySelector('div.comment span.commtext.cdd');
		const liveCommtext = liveComment.querySelector('div.comment span.commtext.cdd');
		const deadCommtext2 = anotherDeadComment.querySelector('div.comment span.commtext.cdd');

		expect(deadCommtext1?.classList.contains('oj_dead_comment')).toBe(true);
		expect(liveCommtext?.classList.contains('oj_dead_comment')).toBe(false);
		expect(deadCommtext2?.classList.contains('oj_dead_comment')).toBe(true);
	});

	it('should handle comments without comhead span', () => {
		const doc = document.implementation.createHTMLDocument();
		const comment = doc.createElement('div');
		comment.innerHTML = `
			<div class="comment">
				<span class="commtext cdd">Comment without comhead</span>
			</div>
		`;

		changeDeadCommentsColor(doc, [comment]);

		const commtext = comment.querySelector('div.comment span.commtext.cdd');
		expect(commtext?.classList.contains('oj_dead_comment')).toBe(false);
	});

	it('should handle comments without commtext element', () => {
		const doc = document.implementation.createHTMLDocument();
		const comment = doc.createElement('div');
		comment.innerHTML = `
			<span class="comhead">user [dead]</span>
			<div class="comment"></div>
		`;

		expect(() => {
			changeDeadCommentsColor(doc, [comment]);
		}).not.toThrow();
	});

	it('should handle empty comments array', () => {
		const doc = document.implementation.createHTMLDocument();

		expect(() => {
			changeDeadCommentsColor(doc, []);
		}).not.toThrow();

		const styleElement = doc.head.querySelector('style');
		expect(styleElement).not.toBeNull();
	});
});
