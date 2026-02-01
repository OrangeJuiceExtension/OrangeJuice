import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContentScriptContext } from '#imports';
import { dom } from '@/utils/dom';
import { collapseRoot } from './collapse-root';

describe('collapseRoot', () => {
	let mockCtx: ContentScriptContext;
	let cleanupFunctions: Array<() => void>;

	beforeEach(() => {
		document.body.innerHTML = '';
		cleanupFunctions = [];

		mockCtx = {
			onInvalidated: vi.fn((callback: () => void) => {
				cleanupFunctions.push(callback);
			}),
		} as unknown as ContentScriptContext;

		vi.spyOn(dom, 'elementPosition').mockReturnValue({ x: 0, y: 100 });
		vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
	});

	it('should skip root comments without adding collapse links', () => {
		const rootComment = document.createElement('div');
		rootComment.innerHTML = `
			<div class="ind"><img width="0" /></div>
			<span class="comhead"></span>
		`;

		const childComment = document.createElement('div');
		childComment.innerHTML = `
			<div class="ind"><img width="40" /></div>
			<span class="comhead"></span>
		`;

		document.body.append(rootComment, childComment);

		collapseRoot(document, [rootComment, childComment], mockCtx);

		const rootComhead = rootComment.querySelector('span.comhead');
		expect(rootComhead?.textContent).not.toContain('[collapse root]');

		const childComhead = childComment.querySelector('span.comhead');
		expect(childComhead?.textContent).toContain('[collapse root]');
	});

	it('should add collapse root links to child comments', () => {
		const rootComment = document.createElement('div');
		rootComment.innerHTML = `
			<div class="ind"><img width="0" /></div>
			<span class="comhead"></span>
			<a class="togg"></a>
		`;

		const childComment = document.createElement('div');
		childComment.innerHTML = `
			<div class="ind"><img width="40" /></div>
			<span class="comhead"></span>
		`;

		document.body.append(rootComment, childComment);

		collapseRoot(document, [rootComment, childComment], mockCtx);

		const comhead = childComment.querySelector('span.comhead');
		const collapseLink = comhead?.querySelector('a');

		expect(collapseLink).toBeTruthy();
		expect(collapseLink?.textContent).toBe('[collapse root]');
	});

	it('should click root toggle and scroll to root when collapse link is clicked', () => {
		const rootComment = document.createElement('div');
		const toggleLink = document.createElement('a');
		toggleLink.className = 'togg';
		toggleLink.click = vi.fn();

		rootComment.innerHTML = `
			<div class="ind"><img width="0" /></div>
			<span class="comhead"></span>
		`;
		rootComment.append(toggleLink);

		const childComment = document.createElement('div');
		childComment.innerHTML = `
			<div class="ind"><img width="40" /></div>
			<span class="comhead"></span>
		`;

		document.body.append(rootComment, childComment);

		collapseRoot(document, [rootComment, childComment], mockCtx);

		const collapseLink = childComment.querySelector<HTMLAnchorElement>('span.comhead a');
		collapseLink?.click();

		expect(toggleLink.click).toHaveBeenCalled();
		expect(window.scrollTo).toHaveBeenCalledWith(0, 100);
	});

	it('should handle multiple child comments with same root', () => {
		const rootComment = document.createElement('div');
		rootComment.innerHTML = `
			<div class="ind"><img width="0" /></div>
			<span class="comhead"></span>
			<a class="togg"></a>
		`;

		const child1 = document.createElement('div');
		child1.innerHTML = `
			<div class="ind"><img width="40" /></div>
			<span class="comhead"></span>
		`;

		const child2 = document.createElement('div');
		child2.innerHTML = `
			<div class="ind"><img width="80" /></div>
			<span class="comhead"></span>
		`;

		document.body.append(rootComment, child1, child2);

		collapseRoot(document, [rootComment, child1, child2], mockCtx);

		const link1 = child1.querySelector('span.comhead a');
		const link2 = child2.querySelector('span.comhead a');

		expect(link1?.textContent).toBe('[collapse root]');
		expect(link2?.textContent).toBe('[collapse root]');
	});

	it('should register cleanup handlers for all added links', () => {
		const rootComment = document.createElement('div');
		rootComment.innerHTML = `
			<div class="ind"><img width="0" /></div>
			<span class="comhead"></span>
			<a class="togg"></a>
		`;

		const child1 = document.createElement('div');
		child1.innerHTML = `
			<div class="ind"><img width="40" /></div>
			<span class="comhead"></span>
		`;

		const child2 = document.createElement('div');
		child2.innerHTML = `
			<div class="ind"><img width="80" /></div>
			<span class="comhead"></span>
		`;

		document.body.append(rootComment, child1, child2);

		collapseRoot(document, [rootComment, child1, child2], mockCtx);

		expect(mockCtx.onInvalidated).toHaveBeenCalledTimes(2);
		expect(cleanupFunctions).toHaveLength(2);
	});

	it('should not add collapse link when comhead is missing', () => {
		const rootComment = document.createElement('div');
		rootComment.innerHTML = `
			<div class="ind"><img width="0" /></div>
			<a class="togg"></a>
		`;

		const childComment = document.createElement('div');
		childComment.innerHTML = `
			<div class="ind"><img width="40" /></div>
		`;

		document.body.append(rootComment, childComment);

		collapseRoot(document, [rootComment, childComment], mockCtx);

		const collapseLink = childComment.querySelector('a');
		expect(collapseLink).toBeNull();
	});

	it('should handle multiple root comments correctly', () => {
		const root1 = document.createElement('div');
		const toggle1 = document.createElement('a');
		toggle1.className = 'togg';
		toggle1.click = vi.fn();
		root1.innerHTML = `
			<div class="ind"><img width="0" /></div>
			<span class="comhead"></span>
		`;
		root1.append(toggle1);

		const child1 = document.createElement('div');
		child1.innerHTML = `
			<div class="ind"><img width="40" /></div>
			<span class="comhead"></span>
		`;

		const root2 = document.createElement('div');
		const toggle2 = document.createElement('a');
		toggle2.className = 'togg';
		toggle2.click = vi.fn();
		root2.innerHTML = `
			<div class="ind"><img width="0" /></div>
			<span class="comhead"></span>
		`;
		root2.append(toggle2);

		const child2 = document.createElement('div');
		child2.innerHTML = `
			<div class="ind"><img width="40" /></div>
			<span class="comhead"></span>
		`;

		document.body.append(root1, child1, root2, child2);

		collapseRoot(document, [root1, child1, root2, child2], mockCtx);

		const link1 = child1.querySelector<HTMLAnchorElement>('span.comhead a');
		const link2 = child2.querySelector<HTMLAnchorElement>('span.comhead a');

		link1?.click();
		expect(toggle1.click).toHaveBeenCalled();
		expect(toggle2.click).not.toHaveBeenCalled();

		link2?.click();
		expect(toggle2.click).toHaveBeenCalled();
	});

	it('should remove event listeners when context is invalidated', () => {
		const rootComment = document.createElement('div');
		const toggleLink = document.createElement('a');
		toggleLink.className = 'togg';
		toggleLink.click = vi.fn();

		rootComment.innerHTML = `
			<div class="ind"><img width="0" /></div>
			<span class="comhead"></span>
		`;
		rootComment.append(toggleLink);

		const childComment = document.createElement('div');
		childComment.innerHTML = `
			<div class="ind"><img width="40" /></div>
			<span class="comhead"></span>
		`;

		document.body.append(rootComment, childComment);

		collapseRoot(document, [rootComment, childComment], mockCtx);

		const collapseLink = childComment.querySelector<HTMLAnchorElement>('span.comhead a');

		// Call all cleanup functions
		for (const cleanup of cleanupFunctions) {
			cleanup();
		}

		// After cleanup, clicking should not trigger the toggle
		collapseLink?.click();
		expect(toggleLink.click).not.toHaveBeenCalled();
	});
});
