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
			triggerElement,
			dropdownElement,
			doc,
			ctx: MOCK_CONTEXT,
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
			triggerElement,
			dropdownElement,
			doc,
			ctx: MOCK_CONTEXT,
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
			triggerElement,
			dropdownElement,
			doc,
			ctx: MOCK_CONTEXT,
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
			triggerElement,
			dropdownElement,
			doc,
			ctx: MOCK_CONTEXT,
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
			triggerElement,
			dropdownElement,
			doc,
			ctx: MOCK_CONTEXT,
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
			triggerElement,
			dropdownElement,
			doc,
			ctx: MOCK_CONTEXT,
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
			triggerElement,
			dropdownElement,
			doc,
			ctx: MOCK_CONTEXT,
		});

		vi.spyOn(triggerElement, 'getBoundingClientRect').mockReturnValue({ left: 100 } as DOMRect);

		expect(dropdownElement.style.left).toBe('');

		window.dispatchEvent(new Event('resize'));

		expect(dropdownElement.style.left).toBe('');
	});

	it('should call onToggle callback with correct state', () => {
		const onToggle = vi.fn();

		createDropdown({
			triggerElement,
			dropdownElement,
			doc,
			ctx: MOCK_CONTEXT,
			onToggle,
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
			triggerElement,
			dropdownElement,
			doc,
			ctx: MOCK_CONTEXT,
			onToggle,
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

	it('should clean up event listeners on context invalidation', () => {
		createDropdown({
			triggerElement,
			dropdownElement,
			doc,
			ctx: MOCK_CONTEXT,
		});

		const triggerRemoveSpy = vi.spyOn(triggerElement, 'removeEventListener');
		const docRemoveSpy = vi.spyOn(doc, 'removeEventListener');
		const windowRemoveSpy = vi.spyOn(window, 'removeEventListener');

		expect(MOCK_CONTEXT.onInvalidated).toHaveBeenCalled();
		const onInvalidatedCallback = MOCK_CONTEXT.onInvalidated.mock.calls[0][0];
		onInvalidatedCallback();

		expect(triggerRemoveSpy).toHaveBeenCalledWith('click', expect.any(Function));
		expect(docRemoveSpy).toHaveBeenCalledWith('click', expect.any(Function));
		expect(windowRemoveSpy).toHaveBeenCalledWith('resize', expect.any(Function));
	});

	it('should return isOpen method', () => {
		const dropdown = createDropdown({
			triggerElement,
			dropdownElement,
			doc,
			ctx: MOCK_CONTEXT,
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
