import { beforeEach, describe, expect, it, vi } from 'vitest';
import { indentToggle } from './indent-toggle.ts';

describe('indentToggle', () => {
	let mockDoc: Document;
	let mockComments: HTMLElement[];

	beforeEach(() => {
		mockDoc = document.implementation.createHTMLDocument('test');
		mockComments = [];
	});

	describe('style injection', () => {
		it('should inject custom styles into document head', () => {
			indentToggle(mockDoc, mockComments);

			const styleElement = mockDoc.head.querySelector('style');
			expect(styleElement).toBeTruthy();
			expect(styleElement?.textContent).toContain('oj_clickable_indent');
		});

		it('should add hover styles for clickable indent', () => {
			indentToggle(mockDoc, mockComments);

			const styleElement = mockDoc.head.querySelector('style');
			expect(styleElement?.textContent).toContain('cursor: pointer');
			expect(styleElement?.textContent).toContain('.oj_clickable_indent:hover');
			expect(styleElement?.textContent).toContain('box-shadow: inset -3px 0 #888');
		});
	});

	describe('clickable indent functionality', () => {
		it('should add clickable class to indent cells', () => {
			const indentCell = mockDoc.createElement('td');
			indentCell.className = 'ind';

			const toggleBtn = mockDoc.createElement('a');
			toggleBtn.className = 'togg';

			const comment = mockDoc.createElement('tr');
			comment.className = 'comtr athing';
			comment.appendChild(indentCell);
			comment.appendChild(toggleBtn);

			mockComments = [comment];

			indentToggle(mockDoc, mockComments);

			expect(indentCell.classList.contains('oj_clickable_indent')).toBe(true);
		});

		it('should trigger toggle button click when indent cell is clicked', () => {
			const indentCell = mockDoc.createElement('td');
			indentCell.className = 'ind';

			const toggleBtn = mockDoc.createElement('a');
			toggleBtn.className = 'togg';
			const clickSpy = vi.fn();
			toggleBtn.click = clickSpy;

			const comment = mockDoc.createElement('tr');
			comment.className = 'comtr athing';
			comment.appendChild(indentCell);
			comment.appendChild(toggleBtn);

			mockComments = [comment];

			indentToggle(mockDoc, mockComments);

			indentCell.click();

			expect(clickSpy).toHaveBeenCalledTimes(1);
		});

		it('should handle multiple comments', () => {
			const comment1 = createCommentWithIndent(mockDoc);
			const comment2 = createCommentWithIndent(mockDoc);
			const comment3 = createCommentWithIndent(mockDoc);

			mockComments = [comment1, comment2, comment3];

			indentToggle(mockDoc, mockComments);

			for (const comment of mockComments) {
				const indentCell = comment.querySelector('td.ind');
				expect(indentCell?.classList.contains('oj_clickable_indent')).toBe(true);
			}
		});

		it('should attach event listeners to multiple comments', () => {
			const comment1 = createCommentWithIndent(mockDoc);
			const comment2 = createCommentWithIndent(mockDoc);

			const toggleBtn1 = comment1.querySelector<HTMLAnchorElement>('a.togg');
			const toggleBtn2 = comment2.querySelector<HTMLAnchorElement>('a.togg');

			const clickSpy1 = vi.fn();
			const clickSpy2 = vi.fn();

			if (toggleBtn1) {
				toggleBtn1.click = clickSpy1;
			}
			if (toggleBtn2) {
				toggleBtn2.click = clickSpy2;
			}

			mockComments = [comment1, comment2];

			indentToggle(mockDoc, mockComments);

			comment1.querySelector<HTMLTableCellElement>('td.ind')?.click();
			comment2.querySelector<HTMLTableCellElement>('td.ind')?.click();

			expect(clickSpy1).toHaveBeenCalledTimes(1);
			expect(clickSpy2).toHaveBeenCalledTimes(1);
		});
	});

	describe('edge cases', () => {
		it('should handle comments without indent cell', () => {
			const toggleBtn = mockDoc.createElement('a');
			toggleBtn.className = 'togg';

			const comment = mockDoc.createElement('tr');
			comment.className = 'comtr athing';
			comment.appendChild(toggleBtn);

			mockComments = [comment];

			expect(() => indentToggle(mockDoc, mockComments)).not.toThrow();

			const indentCell = comment.querySelector('td.ind');
			expect(indentCell).toBeFalsy();
		});

		it('should handle comments without toggle button', () => {
			const indentCell = mockDoc.createElement('td');
			indentCell.className = 'ind';

			const comment = mockDoc.createElement('tr');
			comment.className = 'comtr athing';
			comment.appendChild(indentCell);

			mockComments = [comment];

			expect(() => indentToggle(mockDoc, mockComments)).not.toThrow();

			expect(indentCell.classList.contains('oj_clickable_indent')).toBe(false);
		});

		it('should handle empty comments array', () => {
			mockComments = [];

			expect(() => indentToggle(mockDoc, mockComments)).not.toThrow();

			const styleElement = mockDoc.head.querySelector('style');
			expect(styleElement).toBeTruthy();
		});

		it('should handle comments with both indent cell and toggle button missing', () => {
			const comment = mockDoc.createElement('tr');
			comment.className = 'comtr athing';

			mockComments = [comment];

			expect(() => indentToggle(mockDoc, mockComments)).not.toThrow();
		});

		it('should only add clickable class when both elements exist', () => {
			const commentWithBoth = createCommentWithIndent(mockDoc);
			const commentWithoutToggle = mockDoc.createElement('tr');
			const indentOnly = mockDoc.createElement('td');
			indentOnly.className = 'ind';
			commentWithoutToggle.appendChild(indentOnly);

			mockComments = [commentWithBoth, commentWithoutToggle];

			indentToggle(mockDoc, mockComments);

			const indentWithBoth = commentWithBoth.querySelector('td.ind');
			const indentWithoutToggle = commentWithoutToggle.querySelector('td.ind');

			expect(indentWithBoth?.classList.contains('oj_clickable_indent')).toBe(true);
			expect(indentWithoutToggle?.classList.contains('oj_clickable_indent')).toBe(false);
		});
	});
});

function createCommentWithIndent(doc: Document): HTMLElement {
	const indentCell = doc.createElement('td');
	indentCell.className = 'ind';

	const toggleBtn = doc.createElement('a');
	toggleBtn.className = 'togg';

	const comment = doc.createElement('tr');
	comment.className = 'comtr athing';
	comment.appendChild(indentCell);
	comment.appendChild(toggleBtn);

	return comment;
}
