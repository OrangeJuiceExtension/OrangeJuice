import { beforeEach, describe, expect, it, vi } from 'vitest';
import { navbar } from './index';

describe('navbar more-links', () => {
	let mockContext: any;

	beforeEach(() => {
		document.body.innerHTML = `<div>
			<span class="pagetop">
				<a href="/">Top</a> | <a href="/newest">New</a>
			</span>
			<table>
				<tbody>
					<tr>
						<td><span class="pagetop">Bottom nav</span></td>
					</tr>
				</tbody>
			</table>
		</div>
		`;

		mockContext = {
			onInvalidated: vi.fn(),
		};

		window.location.pathname = '';
		vi.clearAllMocks();
	});

	it('should return early if less than 2 pagetop elements exist', () => {
		document.body.innerHTML = '<span class="pagetop">Only one</span>';
		const result = navbar.main(mockContext);
		expect(result).toBe(undefined);
	});

	it('should add style element to document head', () => {
		navbar.main(mockContext);
		const styles = document.querySelectorAll('style');
		expect(styles.length).toBeGreaterThan(0);
	});

	it('should append "more" button and separator to navbar', () => {
		navbar.main(mockContext);
		const navbarEl = document.querySelector('span.pagetop');
		const button = navbarEl?.querySelector('.oj_more_links_dropdown_button');
		expect(button).toBeTruthy();
		expect(button?.textContent).toBe('more ▾');
	});

	it('should create dropdown element with links', () => {
		navbar.main(mockContext);
		const dropdown = document.querySelector('.oj_more_links_dropdown');
		expect(dropdown).toBeTruthy();

		const links = dropdown?.querySelectorAll('a');
		expect(links?.length).toBeGreaterThan(0);
	});

	it('should exclude current page from dropdown links', () => {
		Object.defineProperty(window, 'location', {
			value: { pathname: '/leaders' },
			writable: true,
		});

		navbar.main(mockContext);
		const dropdown = document.querySelector('.oj_more_links_dropdown');
		const links = dropdown?.querySelectorAll('a');

		const leadersLink = Array.from(links || []).find((link) => link.textContent === 'leaders');
		expect(leadersLink).toBeUndefined();
	});

	it('should toggle dropdown display on button click', () => {
		navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		expect(dropdown.classList.contains('active')).toBe(false);

		button.click();
		expect(dropdown.classList.contains('active')).toBe(true);
		expect(button.textContent).toBe('more ▴');

		button.click();
		expect(dropdown.classList.contains('active')).toBe(false);
		expect(button.textContent).toBe('more ▾');
	});

	it('should not toggle dropdown on modified click', () => {
		navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		const clickEvent = new MouseEvent('click', {
			ctrlKey: true,
		});

		button.dispatchEvent(clickEvent);
		expect(dropdown.classList.contains('active')).toBe(false);
	});

	it('should update dropdown position on window resize when dropdown is open', () => {
		navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		button.click();

		window.dispatchEvent(new Event('resize'));

		expect(dropdown.style.left).toBe(`${button.getBoundingClientRect().left}px`);
	});

	it('should not update dropdown position on resize when dropdown is closed', () => {
		navbar.main(mockContext);
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		dropdown.style.left = '100px';
		window.dispatchEvent(new Event('resize'));

		expect(dropdown.style.left).toBe('100px');
	});

	it('should clean up event listeners on context invalidation', () => {
		navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;

		const removeEventListenerSpy = vi.spyOn(button, 'removeEventListener');
		const windowRemoveEventListenerSpy = vi.spyOn(window, 'removeEventListener');

		expect(mockContext.onInvalidated).toHaveBeenCalled();
		const cleanupFn = mockContext.onInvalidated.mock.calls[0][0];
		cleanupFn();

		expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
		expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
	});

	it('should set correct link attributes', () => {
		navbar.main(mockContext);
		const dropdown = document.querySelector('.oj_more_links_dropdown');
		const firstLink = dropdown?.querySelector('a');

		expect(firstLink?.href).toContain('leaders');
		expect(firstLink?.title).toBe('Users with most karma');
	});

	it('should close dropdown when clicking outside', () => {
		navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		button.click();
		expect(dropdown.classList.contains('active')).toBe(true);
		expect(button.textContent).toBe('more ▴');

		document.body.click();
		expect(dropdown.classList.contains('active')).toBe(false);
		expect(button.textContent).toBe('more ▾');
	});

	it('should not close dropdown when clicking inside dropdown', () => {
		navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		button.click();
		expect(dropdown.classList.contains('active')).toBe(true);

		dropdown.click();
		expect(dropdown.classList.contains('active')).toBe(true);
	});

	it('should not close dropdown when clicking the button itself', () => {
		navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		button.click();
		expect(dropdown.classList.contains('active')).toBe(true);

		button.click();
		expect(dropdown.classList.contains('active')).toBe(false);
	});

	it('should clean up outside click listener on context invalidation', () => {
		navbar.main(mockContext);
		const documentRemoveEventListenerSpy = vi.spyOn(document, 'removeEventListener');

		expect(mockContext.onInvalidated).toHaveBeenCalled();
		const cleanupFn = mockContext.onInvalidated.mock.calls[0][0];
		cleanupFn();

		expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
	});
});
