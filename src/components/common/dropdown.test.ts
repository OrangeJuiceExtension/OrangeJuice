import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDropdown, createDropdownStyle } from './dropdown';

const MOCK_CONTEXT = {
	onInvalidated: vi.fn(),
} as any;

describe('createDropdown', () => {
	let doc: Document;
	let triggerElement: HTMLElement;
	let dropdownElement: HTMLDivElement;

	beforeEach(() => {
		vi.clearAllMocks();
		doc = document.implementation.createHTMLDocument();
		triggerElement = doc.createElement('a');
		dropdownElement = doc.createElement('div');
		doc.body.appendChild(triggerElement);
		doc.body.appendChild(dropdownElement);
	});

	it('should toggle dropdown on trigger element click', () => {
		createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement,
			triggerElement,
		});

		expect(dropdownElement.classList.contains('active')).toBe(false);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });
		vi.spyOn(triggerElement, 'getBoundingClientRect').mockReturnValue({ left: 100 } as DOMRect);

		triggerElement.dispatchEvent(clickEvent);

		expect(dropdownElement.classList.contains('active')).toBe(true);

		triggerElement.dispatchEvent(clickEvent);

		expect(dropdownElement.classList.contains('active')).toBe(false);
	});

	it('should not toggle dropdown on modified click', () => {
		createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement,
			triggerElement,
		});

		const clickEvent = new MouseEvent('click', {
			bubbles: true,
			cancelable: true,
			metaKey: true,
		});

		triggerElement.dispatchEvent(clickEvent);

		expect(dropdownElement.classList.contains('active')).toBe(false);
	});

	it('should close dropdown when clicking outside', () => {
		createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement,
			triggerElement,
		});

		vi.spyOn(triggerElement, 'getBoundingClientRect').mockReturnValue({ left: 100 } as DOMRect);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });

		triggerElement.dispatchEvent(clickEvent);

		expect(dropdownElement.classList.contains('active')).toBe(true);

		const outsideElement = doc.createElement('div');
		doc.body.appendChild(outsideElement);
		const outsideClickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(outsideClickEvent, 'target', { value: outsideElement });

		doc.dispatchEvent(outsideClickEvent);

		expect(dropdownElement.classList.contains('active')).toBe(false);
	});

	it('should not close dropdown when clicking inside dropdown', () => {
		createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement,
			triggerElement,
		});

		vi.spyOn(triggerElement, 'getBoundingClientRect').mockReturnValue({ left: 100 } as DOMRect);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });

		triggerElement.dispatchEvent(clickEvent);

		expect(dropdownElement.classList.contains('active')).toBe(true);

		const insideClickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(insideClickEvent, 'target', { value: dropdownElement });

		doc.dispatchEvent(insideClickEvent);

		expect(dropdownElement.classList.contains('active')).toBe(true);
	});

	it('should not close dropdown when clicking on trigger element', () => {
		createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement,
			triggerElement,
		});

		vi.spyOn(triggerElement, 'getBoundingClientRect').mockReturnValue({ left: 100 } as DOMRect);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });

		triggerElement.dispatchEvent(clickEvent);

		expect(dropdownElement.classList.contains('active')).toBe(true);

		const triggerClickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(triggerClickEvent, 'target', { value: triggerElement });

		doc.dispatchEvent(triggerClickEvent);

		expect(dropdownElement.classList.contains('active')).toBe(true);
	});

	it('should update dropdown position on window resize when open', () => {
		createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement,
			triggerElement,
		});

		const getBoundingClientRectSpy = vi
			.spyOn(triggerElement, 'getBoundingClientRect')
			.mockReturnValue({ left: 100 } as DOMRect);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });

		triggerElement.dispatchEvent(clickEvent);

		expect(dropdownElement.style.left).toBe('100px');

		getBoundingClientRectSpy.mockReturnValue({ left: 200 } as DOMRect);

		window.dispatchEvent(new Event('resize'));

		expect(dropdownElement.style.left).toBe('200px');
	});

	it('should not update dropdown position on resize when closed', () => {
		createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement,
			triggerElement,
		});

		vi.spyOn(triggerElement, 'getBoundingClientRect').mockReturnValue({ left: 100 } as DOMRect);

		expect(dropdownElement.style.left).toBe('');

		window.dispatchEvent(new Event('resize'));

		expect(dropdownElement.style.left).toBe('');
	});

	it('should call onToggle callback with correct state', () => {
		const onToggle = vi.fn();

		createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement,
			onToggle,
			triggerElement,
		});

		vi.spyOn(triggerElement, 'getBoundingClientRect').mockReturnValue({ left: 100 } as DOMRect);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });

		triggerElement.dispatchEvent(clickEvent);

		expect(onToggle).toHaveBeenCalledWith(true);

		triggerElement.dispatchEvent(clickEvent);

		expect(onToggle).toHaveBeenCalledWith(false);
	});

	it('should call onToggle when closing via outside click', () => {
		const onToggle = vi.fn();

		createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement,
			onToggle,
			triggerElement,
		});

		vi.spyOn(triggerElement, 'getBoundingClientRect').mockReturnValue({ left: 100 } as DOMRect);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });

		triggerElement.dispatchEvent(clickEvent);

		expect(onToggle).toHaveBeenCalledWith(true);

		const outsideElement = doc.createElement('div');
		doc.body.appendChild(outsideElement);
		const outsideClickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(outsideClickEvent, 'target', { value: outsideElement });

		doc.dispatchEvent(outsideClickEvent);

		expect(onToggle).toHaveBeenCalledWith(false);
	});

	it('should close an already-open dropdown before opening another', () => {
		const secondTriggerElement = doc.createElement('a');
		const secondDropdownElement = doc.createElement('div');
		doc.body.append(secondTriggerElement, secondDropdownElement);

		createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement,
			triggerElement,
		});
		createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement: secondDropdownElement,
			triggerElement: secondTriggerElement,
		});

		vi.spyOn(triggerElement, 'getBoundingClientRect').mockReturnValue({ left: 100 } as DOMRect);
		vi.spyOn(secondTriggerElement, 'getBoundingClientRect').mockReturnValue({
			left: 200,
		} as DOMRect);

		const firstClickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(firstClickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(firstClickEvent, 'stopPropagation', { value: vi.fn() });
		triggerElement.dispatchEvent(firstClickEvent);

		expect(dropdownElement.classList.contains('active')).toBe(true);
		expect(secondDropdownElement.classList.contains('active')).toBe(false);

		const secondClickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(secondClickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(secondClickEvent, 'stopPropagation', { value: vi.fn() });
		secondTriggerElement.dispatchEvent(secondClickEvent);

		expect(dropdownElement.classList.contains('active')).toBe(false);
		expect(secondDropdownElement.classList.contains('active')).toBe(true);
	});

	it('should clean up event listeners on context invalidation', () => {
		createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement,
			triggerElement,
		});

		const triggerRemoveSpy = vi.spyOn(triggerElement, 'removeEventListener');
		const docRemoveSpy = vi.spyOn(doc, 'removeEventListener');
		const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');

		expect(MOCK_CONTEXT.onInvalidated).toHaveBeenCalled();
		const [[onInvalidatedCallback]] = MOCK_CONTEXT.onInvalidated.mock.calls;
		onInvalidatedCallback();

		expect(triggerRemoveSpy).toHaveBeenCalledWith('click', expect.any(Function));
		expect(docRemoveSpy).toHaveBeenCalledWith('click', expect.any(Function));
		expect(windowRemoveSpy).toHaveBeenCalledWith('resize', expect.any(Function));
	});

	it('should return isOpen method', () => {
		const dropdown = createDropdown({
			ctx: MOCK_CONTEXT,
			doc,
			dropdownElement,
			triggerElement,
		});

		expect(dropdown.isOpen()).toBe(false);

		vi.spyOn(triggerElement, 'getBoundingClientRect').mockReturnValue({ left: 100 } as DOMRect);

		const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
		Object.defineProperty(clickEvent, 'preventDefault', { value: vi.fn() });
		Object.defineProperty(clickEvent, 'stopPropagation', { value: vi.fn() });

		triggerElement.dispatchEvent(clickEvent);

		expect(dropdown.isOpen()).toBe(true);
	});
});

describe('createDropdownStyle', () => {
	it('should create dropdown style with given class name', () => {
		const style = createDropdownStyle('test_dropdown');

		expect(style).toContain('.test_dropdown');
		expect(style).toContain('border: 1px solid #000');
		expect(style).toContain('position: absolute');
		expect(style).toContain('background-color: #fff');
	});

	it('should include link styles', () => {
		const style = createDropdownStyle('test_dropdown');

		expect(style).toContain('.test_dropdown a');
		expect(style).toContain('.test_dropdown a:visited');
		expect(style).toContain('display: block');
		expect(style).toContain('text-decoration: underline');
	});

	it('should include default display none and active class', () => {
		const style = createDropdownStyle('test_dropdown');

		expect(style).toContain('display: none');
		expect(style).toContain('.test_dropdown.active');
	});
});
