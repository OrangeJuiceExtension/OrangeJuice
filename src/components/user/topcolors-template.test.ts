import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { topcolorsTemplate } from '@/components/user/topcolors-template.tsx';
import { USERNAME_STORAGE_KEY } from '@/utils/dom.ts';
import lStorage from '@/utils/local-storage.ts';

describe('topcolorsTemplate', () => {
	beforeEach(async () => {
		document.body.innerHTML = '';
		document.documentElement.classList.remove('oj-dark-mode', 'oj-topbar-readable');
		document.documentElement.style.removeProperty('--oj-topbar-fg');
		await lStorage.setItem(USERNAME_STORAGE_KEY, null);
		vi.clearAllMocks();
	});

	it('does nothing on non-topcolors pages', async () => {
		window.history.pushState({}, '', '/news');

		document.body.innerHTML = `
			<div id="bigbox">
				<table><tbody>
					<tr><td>
						<table><tbody>
							<tr><td>#fa61ff</td><td bgcolor="#fa61ff"></td></tr>
						</tbody></table>
					</td></tr>
				</tbody></table>
			</div>
		`;

		await topcolorsTemplate(document);

		expect(document.getElementById('oj-topcolors-root')).toBeNull();
	});

	it('selects a color from the spectrum and copies its hex', async () => {
		window.history.pushState({}, '', '/topcolors');

		document.body.innerHTML = `
			<div id="bigbox">
				<table><tbody>
					<tr><td>
						<table><tbody>
							<tr><td>#fa61ff</td><td bgcolor="#fa61ff"></td></tr>
							<tr><td>#123456</td><td bgcolor="#123456"></td></tr>
						</tbody></table>
					</td></tr>
				</tbody></table>
			</div>
		`;

		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: { writeText },
		});

		await topcolorsTemplate(document);

		await waitFor(() => {
			const items = document.querySelectorAll('.oj-topcolors__swatch');
			expect(items).toHaveLength(2);
		});

		const swatch = document.querySelector<HTMLButtonElement>('[data-hex="#fa61ff"]');
		swatch?.click();
		document.querySelector<HTMLButtonElement>('.oj-topcolors__copy-button')?.click();

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith('#fa61ff');
			const toast = document.querySelector('.oj-topcolors__status');
			expect(toast?.textContent).toBe('Copied #fa61ff');
		});
	});

	it('previews on focus, restores the selection on blur, and selects without copying', async () => {
		window.history.pushState({}, '', '/topcolors');
		document.body.innerHTML = `<div id="bigbox"><table><tbody><tr><td>
			<table><tbody><tr><td>#ff6600</td></tr><tr><td>#0000ff</td></tr></tbody></table>
		</td></tr></tbody></table></div>`;
		const writeText = vi.fn();
		Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
		await topcolorsTemplate(document);
		const blue = document.querySelector<HTMLButtonElement>('[data-hex="#0000ff"]');
		const copy = document.querySelector<HTMLButtonElement>('.oj-topcolors__copy-button');
		blue?.focus();
		expect(document.querySelector('.oj-topcolors__hex')?.textContent).toBe('#0000ff');
		copy?.focus();
		expect(document.querySelector('.oj-topcolors__hex')?.textContent).toBe('#ff6600');
		blue?.click();
		expect(blue?.getAttribute('aria-pressed')).toBe('true');
		expect(document.querySelector('[data-hex="#ff6600"]')?.getAttribute('aria-pressed')).toBe(
			'false'
		);
		expect(document.querySelector('.oj-topcolors__rank')?.textContent).toBe('#2 in popularity');
		expect(writeText).not.toHaveBeenCalled();
	});

	it('uses arrow keys and keeps only one tab stop in each palette', async () => {
		window.history.pushState({}, '', '/topcolors');
		document.body.innerHTML = `<div id="bigbox"><table><tbody><tr><td>
			<table><tbody><tr><td>#ff0000</td></tr><tr><td>#0000ff</td></tr><tr><td>#ffffff</td></tr></tbody></table>
		</td></tr></tbody></table></div>`;
		await topcolorsTemplate(document);
		const red = document.querySelector<HTMLButtonElement>('[data-hex="#ff0000"]');
		const blue = document.querySelector<HTMLButtonElement>('[data-hex="#0000ff"]');
		red?.focus();
		red?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
		expect(document.activeElement).toBe(blue);
		expect(red?.tabIndex).toBe(-1);
		expect(blue?.tabIndex).toBe(0);
		expect(document.querySelectorAll('.oj-topcolors__swatch[tabindex="0"]')).toHaveLength(2);
		blue?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Home' }));
		expect(document.activeElement).toBe(red);
	});

	it.each([
		{ darkMode: false, foreground: '#f1efec', hex: '#00007f' },
		{ darkMode: false, foreground: '#111111', hex: '#ffffff' },
		{ darkMode: true, foreground: '#111111', hex: '#f6f6ef' },
	])(
		'previews selected $hex on the top bar with readable text',
		async ({ hex, foreground, darkMode }) => {
			window.history.pushState({}, '', '/topcolors');
			document.documentElement.classList.toggle('oj-dark-mode', darkMode);
			document.body.innerHTML = `<table id="hnmain"><tbody>
			<tr><td id="spacer" bgcolor="#000000"></td></tr>
			<tr><td id="navbar" bgcolor="#ff6600" style="background-color: #ff6600"><table><tbody><tr><td>
				<span class="pagetop">Custom Colors</span>
			</td></tr></tbody></table></td></tr>
			<tr id="bigbox"><td><table><tbody>
				<tr><td>#ff6600</td></tr><tr><td>${hex}</td></tr>
			</tbody></table></td></tr>
		</tbody></table>`;
			const fetchMock = vi.spyOn(globalThis, 'fetch');
			await topcolorsTemplate(document);
			const navbar = document.querySelector<HTMLTableCellElement>('#navbar');
			const swatch = document.querySelector<HTMLButtonElement>(`[data-hex="${hex}"]`);
			swatch?.dispatchEvent(new MouseEvent('pointerenter'));
			expect(navbar?.getAttribute('bgcolor')).toBe('#ff6600');
			swatch?.click();
			expect(navbar?.getAttribute('bgcolor')).toBe(hex);
			expect(navbar?.style.backgroundColor).toBe(hex);
			expect(document.documentElement.style.getPropertyValue('--oj-topbar-fg')).toBe(
				foreground
			);
			expect(document.querySelector('#spacer')?.getAttribute('bgcolor')).toBe('#000000');
			expect(fetchMock).not.toHaveBeenCalled();
			document.querySelector<HTMLButtonElement>('[data-hex="#ff6600"]')?.click();
			expect(navbar?.getAttribute('bgcolor')).toBe('#ff6600');
			expect(document.documentElement.style.getPropertyValue('--oj-topbar-fg')).toBe(
				'#111111'
			);
		}
	);

	it.each(['unavailable', 'rejected'])(
		'reports an %s clipboard without an unhandled rejection',
		async (name) => {
			window.history.pushState({}, '', '/topcolors');
			document.body.innerHTML = `<div id="bigbox"><table><tbody><tr><td>
			<table><tbody><tr><td>#ff6600</td></tr></tbody></table>
		</td></tr></tbody></table></div>`;
			const clipboard =
				name === 'unavailable'
					? undefined
					: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) };
			Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
			await topcolorsTemplate(document);
			document.querySelector<HTMLButtonElement>('.oj-topcolors__copy-button')?.click();
			await waitFor(() =>
				expect(document.querySelector('.oj-topcolors__status')?.textContent).toContain(
					'Could not copy'
				)
			);
		}
	);

	it('renders colors from table when page has non-color anchors', async () => {
		window.history.pushState({}, '', '/topcolors');

		document.body.innerHTML = `
			<div id="bigbox">
				<a href="/news">news</a>
				<table><tbody>
					<tr><td>
						<table><tbody>
							<tr><td>#fa61ff</td><td bgcolor="#fa61ff"></td></tr>
						</tbody></table>
					</td></tr>
				</tbody></table>
			</div>
		`;

		await topcolorsTemplate(document);

		await waitFor(() => {
			const items = document.querySelectorAll('.oj-topcolors__swatch');
			expect(items).toHaveLength(1);
		});
	});

	it('hides save button when username is unavailable', async () => {
		window.history.pushState({}, '', '/topcolors');
		document.body.innerHTML = `
			<div id="bigbox">
				<table><tbody>
					<tr><td>
						<table><tbody>
							<tr><td>#fa61ff</td><td bgcolor="#fa61ff"></td></tr>
						</tbody></table>
					</td></tr>
				</tbody></table>
			</div>
		`;

		await topcolorsTemplate(document);

		await waitFor(() => {
			const saveButton = document.querySelector('.oj-topcolors__save-button');
			expect(saveButton).toBeNull();
		});
	});

	it('submits user settings form with hidden fields, top color override, and reload', async () => {
		window.history.pushState({}, '', '/topcolors');
		await lStorage.setItem(USERNAME_STORAGE_KEY, 'alice');

		document.body.innerHTML = `
			<div id="hnmain">
				<div id="bigbox">
					<table><tbody>
						<tr><td>
							<table><tbody>
								<tr><td>#ff6600</td><td bgcolor="#ff6600"></td></tr>
								<tr><td>#fa61ff</td><td bgcolor="#fa61ff"></td></tr>
							</tbody></table>
						</td></tr>
					</tbody></table>
				</div>
			</div>
		`;

		const userSettingsHtml = `
			<html>
				<body>
					<form action="xuser" method="post">
						<input type="hidden" name="hmac" value="token123">
						<input type="hidden" name="acct" value="alice">
						<input type="text" name="topc" value="FF6600" size="20">
						<input type="checkbox" name="noprocrast" value="t" checked>
						<input type="checkbox" name="showdead" value="t">
					</form>
				</body>
			</html>
		`;

		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(userSettingsHtml, { status: 200 }))
			.mockResolvedValueOnce(new Response('', { status: 200 }));
		const reloadMock = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: { writeText },
		});

		await topcolorsTemplate(document);

		await waitFor(() => {
			const saveButton = document.querySelector('.oj-topcolors__save-button');
			expect(saveButton).toBeTruthy();
		});

		const saveButton = document.querySelector(
			'.oj-topcolors__save-button'
		) as HTMLButtonElement | null;
		document.querySelector<HTMLButtonElement>('[data-hex="#fa61ff"]')?.click();
		saveButton?.click();

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});

		const [firstCall] = fetchMock.mock.calls;
		expect(firstCall?.[0]).toBe(`${window.location.origin}/user?id=alice`);

		const [, secondCall] = fetchMock.mock.calls;
		expect(secondCall?.[0]).toBe(`${window.location.origin}/xuser`);
		expect(secondCall?.[1]?.method).toBe('POST');

		const lastCallBody = fetchMock.mock.calls[1]?.[1]?.body as string;
		expect(lastCallBody).toContain('acct=alice');
		expect(lastCallBody).toContain('topc=%23fa61ff');
		expect(lastCallBody).toContain('noprocrast=t');
		expect(lastCallBody).not.toContain('showdead');

		expect(reloadMock).toHaveBeenCalledTimes(1);

		fetchMock.mockRestore();
		reloadMock.mockRestore();
	});

	it('hides save button when fetched settings form has no topc input', async () => {
		window.history.pushState({}, '', '/topcolors');
		await lStorage.setItem(USERNAME_STORAGE_KEY, 'alice');

		document.body.innerHTML = `
			<div id="bigbox">
				<table><tbody>
					<tr><td>
						<table><tbody>
							<tr><td>#fa61ff</td><td bgcolor="#fa61ff"></td></tr>
						</tbody></table>
					</td></tr>
				</tbody></table>
			</div>
		`;

		const userSettingsHtml = `
			<html>
				<body>
					<form action="xuser" method="post">
						<input type="hidden" name="hmac" value="token123">
						<input type="hidden" name="acct" value="alice">
						<input type="checkbox" name="noprocrast" value="t" checked>
					</form>
				</body>
			</html>
		`;

		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(userSettingsHtml, { status: 200 }));

		await topcolorsTemplate(document);

		await waitFor(() => {
			const saveButton = document.querySelector('.oj-topcolors__save-button');
			expect(saveButton).toBeNull();
		});

		fetchMock.mockRestore();
	});

	it('hides save button when fetched user page has no forms', async () => {
		window.history.pushState({}, '', '/topcolors');
		await lStorage.setItem(USERNAME_STORAGE_KEY, 'alice');

		document.body.innerHTML = `
			<div id="bigbox">
				<table><tbody>
					<tr><td>
						<table><tbody>
							<tr><td>#fa61ff</td><td bgcolor="#fa61ff"></td></tr>
						</tbody></table>
					</td></tr>
				</tbody></table>
			</div>
		`;

		const userSettingsHtml = `
			<html>
				<body>
					<p>No forms here!</p>
				</body>
			</html>
		`;

		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(userSettingsHtml, { status: 200 }));

		await topcolorsTemplate(document);

		await waitFor(() => {
			const saveButton = document.querySelector('.oj-topcolors__save-button');
			expect(saveButton).toBeNull();
		});

		fetchMock.mockRestore();
	});
	it.each(['http', 'network'])(
		'reports a %s save failure and allows retrying',
		async (failure) => {
			window.history.pushState({}, '', '/topcolors');
			await lStorage.setItem(USERNAME_STORAGE_KEY, 'alice');
			document.body.innerHTML = `<div id="bigbox"><table><tbody><tr><td>
			<table><tbody><tr><td>#ff6600</td></tr></tbody></table>
		</td></tr></tbody></table></div>`;
			const fetchMock = vi
				.spyOn(globalThis, 'fetch')
				.mockResolvedValueOnce(
					new Response(
						'<form action="xuser" method="post"><input name="topc" value="#ff6600"></form>'
					)
				);
			if (failure === 'http') {
				fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
			} else {
				fetchMock.mockRejectedValueOnce(new Error('Offline'));
			}
			const reloadMock = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
			await topcolorsTemplate(document);
			const save = document.querySelector<HTMLButtonElement>('.oj-topcolors__save-button');
			save?.click();
			expect(save?.disabled).toBe(true);
			await waitFor(() =>
				expect(document.querySelector('.oj-topcolors__status')?.textContent).toContain(
					'Could not save'
				)
			);
			expect(save?.disabled).toBe(false);
			expect(reloadMock).not.toHaveBeenCalled();
		}
	);
});
