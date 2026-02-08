import { beforeEach, describe, expect, it, vi } from 'vitest';
import { navbar } from './index';

describe('navbar more-links', () => {
	let mockContext: any;

	beforeEach(() => {
		document.body.innerHTML = `
			<table class="oj-hn-nav-table">
				<tbody>
					<tr>
						<td>
							<span class="pagetop">
								<a href="/">Top</a> | <a href="/newest">New</a>
							</span>
						</td>
					</tr>
				</tbody>
			</table>
		`;

		mockContext = {
			onInvalidated: vi.fn(),
		};

		window.history.pushState({}, '', '/news');
		vi.clearAllMocks();
	});

	it('should return early if navbar is missing', async () => {
		document.body.innerHTML = '<span class="pagetop">Only one</span>';
		await navbar.main(mockContext);
		expect(document.querySelector('.oj_more_links_dropdown')).toBeNull();
	});

	it('should add style element to document head', async () => {
		await navbar.main(mockContext);
		const styles = document.querySelectorAll('style');
		expect(styles.length).toBeGreaterThan(0);
	});

	it('should append "more" button and separator to navbar', async () => {
		await navbar.main(mockContext);
		const navbarEl = document.querySelector('span.pagetop');
		const button = navbarEl?.querySelector('.oj_more_links_dropdown_button');
		expect(button).toBeTruthy();
		expect(button?.textContent).toBe('more ▾');
	});

	it('should create dropdown element with links', async () => {
		await navbar.main(mockContext);
		const dropdown = document.querySelector('.oj_more_links_dropdown');
		expect(dropdown).toBeTruthy();

		const links = dropdown?.querySelectorAll('a');
		expect(links?.length).toBeGreaterThan(0);
	});

	it('should exclude current page from dropdown links', async () => {
		window.history.pushState({}, '', '/leaders');

		await navbar.main(mockContext);
		const dropdown = document.querySelector('.oj_more_links_dropdown');
		const links = dropdown?.querySelectorAll('a');

		const leadersLink = Array.from(links || []).find((link) => link.textContent === 'leaders');
		expect(leadersLink).toBeUndefined();
	});

	it('should toggle dropdown display on button click', async () => {
		await navbar.main(mockContext);
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

	it('should not toggle dropdown on modified click', async () => {
		await navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		const clickEvent = new MouseEvent('click', {
			ctrlKey: true,
		});

		button.dispatchEvent(clickEvent);
		expect(dropdown.classList.contains('active')).toBe(false);
	});

	it('should update dropdown position on window resize when dropdown is open', async () => {
		await navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		button.click();

		window.dispatchEvent(new Event('resize'));

		expect(dropdown.style.left).toBe(`${button.getBoundingClientRect().left}px`);
	});

	it('should not update dropdown position on resize when dropdown is closed', async () => {
		await navbar.main(mockContext);
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		dropdown.style.left = '100px';
		window.dispatchEvent(new Event('resize'));

		expect(dropdown.style.left).toBe('100px');
	});

	it('should clean up event listeners on context invalidation', async () => {
		await navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;

		const removeEventListenerSpy = vi.spyOn(button, 'removeEventListener');
		const windowRemoveEventListenerSpy = vi.spyOn(window, 'removeEventListener');

		expect(mockContext.onInvalidated).toHaveBeenCalled();
		for (const [cleanupFn] of mockContext.onInvalidated.mock.calls) {
			cleanupFn();
		}

		expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
		expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
	});

	it('should set correct link attributes', async () => {
		await navbar.main(mockContext);
		const dropdown = document.querySelector('.oj_more_links_dropdown');
		const firstLink = dropdown?.querySelector('a');

		expect(firstLink?.href).toContain('leaders');
		expect(firstLink?.title).toBe('Users with most karma');
	});

	it('should close dropdown when clicking outside', async () => {
		await navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		button.click();
		expect(dropdown.classList.contains('active')).toBe(true);
		expect(button.textContent).toBe('more ▴');

		document.body.click();
		expect(dropdown.classList.contains('active')).toBe(false);
		expect(button.textContent).toBe('more ▾');
	});

	it('should not close dropdown when clicking inside dropdown', async () => {
		await navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		button.click();
		expect(dropdown.classList.contains('active')).toBe(true);

		dropdown.click();
		expect(dropdown.classList.contains('active')).toBe(true);
	});

	it('should not close dropdown when clicking the button itself', async () => {
		await navbar.main(mockContext);
		const button = document.querySelector('.oj_more_links_dropdown_button') as HTMLElement;
		const dropdown = document.querySelector('.oj_more_links_dropdown') as HTMLElement;

		button.click();
		expect(dropdown.classList.contains('active')).toBe(true);

		button.click();
		expect(dropdown.classList.contains('active')).toBe(false);
	});

	it('should clean up outside click listener on context invalidation', async () => {
		await navbar.main(mockContext);
		const documentRemoveEventListenerSpy = vi.spyOn(document, 'removeEventListener');

		expect(mockContext.onInvalidated).toHaveBeenCalled();
		for (const [cleanupFn] of mockContext.onInvalidated.mock.calls) {
			cleanupFn();
		}

		expect(documentRemoveEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
	});
});
