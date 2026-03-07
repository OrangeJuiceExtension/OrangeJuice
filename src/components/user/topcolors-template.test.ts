import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { topcolorsTemplate } from '@/components/user/topcolors-template.tsx';
import { USERNAME_STORAGE_KEY } from '@/utils/dom.ts';
import lStorage from '@/utils/local-storage.ts';

describe('topcolorsTemplate', () => {
	beforeEach(async () => {
		document.body.innerHTML = '';
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

	it('renders colors from the topcolors table and copies on click', async () => {
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
			value: { writeText },
			configurable: true,
		});

		await topcolorsTemplate(document);

		await waitFor(() => {
			const items = document.querySelectorAll('.oj-topcolors__item');
			expect(items).toHaveLength(2);
		});

		const firstCard = document.querySelector('.oj-topcolors__card') as HTMLAnchorElement;
		firstCard.click();

		await waitFor(() => {
			expect(writeText).toHaveBeenCalledWith('#fa61ff');
			const toast = document.getElementById('oj-topcolors-toast');
			expect(toast?.textContent).toBe('Copied #fa61ff');
		});
	});

	it('shows copied toast with matching swatch shape and color', async () => {
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

		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, 'clipboard', {
			value: { writeText },
			configurable: true,
		});

		const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.45);

		await topcolorsTemplate(document);

		await waitFor(() => {
			const firstCard = document.querySelector('.oj-topcolors__card');
			expect(firstCard).toBeTruthy();
		});

		const firstCard = document.querySelector('.oj-topcolors__card') as HTMLAnchorElement;
		firstCard.click();

		await waitFor(() => {
			const toast = document.getElementById('oj-topcolors-toast');
			const swatch = toast?.querySelector(
				'.oj-topcolors__toast-swatch'
			) as HTMLElement | null;
			expect(swatch).toBeTruthy();
			expect(swatch?.classList.contains('oj-topcolors__swatch--diamond')).toBe(true);
			expect(swatch?.style.backgroundColor).toBe('#fa61ff');
		});

		randomSpy.mockRestore();
	});

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
			const items = document.querySelectorAll('.oj-topcolors__item');
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
			value: { writeText },
			configurable: true,
		});

		await topcolorsTemplate(document);

		await waitFor(() => {
			const saveButton = document.querySelector('.oj-topcolors__save-button');
			expect(saveButton).toBeTruthy();
		});

		const saveButton = document.querySelector(
			'.oj-topcolors__save-button'
		) as HTMLButtonElement | null;
		saveButton?.click();

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});

		const firstCall = fetchMock.mock.calls[0];
		expect(firstCall?.[0]).toBe(`${window.location.origin}/user?id=alice`);

		const secondCall = fetchMock.mock.calls[1];
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
});
