import { beforeEach, describe, expect, it, vi } from 'vitest';
import { topcolorsTemplate } from '@/components/user/topcolors-template.tsx';
import { USERNAME_STORAGE_KEY } from '@/utils/dom.ts';
import lStorage from '@/utils/local-storage.ts';

const flushEffects = async () => {
	await new Promise((resolve) => setTimeout(resolve, 0));
};

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
		await flushEffects();

		const items = document.querySelectorAll('.oj-topcolors__item');
		expect(items).toHaveLength(2);

		const firstCard = document.querySelector('.oj-topcolors__card') as HTMLAnchorElement;
		firstCard.click();
		await flushEffects();

		expect(writeText).toHaveBeenCalledWith('#fa61ff');
		const toast = document.getElementById('oj-topcolors-toast');
		expect(toast?.textContent).toBe('Copied #fa61ff');
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
		await flushEffects();

		const firstCard = document.querySelector('.oj-topcolors__card') as HTMLAnchorElement;
		firstCard.click();
		await flushEffects();

		const toast = document.getElementById('oj-topcolors-toast');
		const swatch = toast?.querySelector('.oj-topcolors__toast-swatch') as HTMLElement | null;
		expect(swatch).toBeTruthy();
		expect(swatch?.classList.contains('oj-topcolors__swatch--diamond')).toBe(true);
		expect(swatch?.style.backgroundColor).toBe('#fa61ff');

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
		await flushEffects();

		const items = document.querySelectorAll('.oj-topcolors__item');
		expect(items).toHaveLength(1);
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
		await flushEffects();

		expect(document.querySelector('.oj-topcolors__save-button')).toBeNull();
	});

	it('submits user settings form with hidden fields and top color override without navigation', async () => {
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
		await flushEffects();

		const saveButton = document.querySelector(
			'.oj-topcolors__save-button'
		) as HTMLButtonElement | null;
		expect(saveButton).toBeTruthy();
		saveButton?.click();
		await flushEffects();

		expect(fetchMock).toHaveBeenCalledWith(`${window.location.origin}/user?id=alice`, {
			cache: 'no-store',
			credentials: 'include',
		});
		expect(writeText).not.toHaveBeenCalled();
		expect(fetchMock).toHaveBeenCalledTimes(2);

		const secondCall = fetchMock.mock.calls[1];
		expect(secondCall).toBeTruthy();
		const [submitUrl, submitInit] = secondCall;
		expect(submitUrl).toBe(`${window.location.origin}/xuser`);
		expect(submitInit).toMatchObject({
			cache: 'no-store',
			credentials: 'include',
			method: 'POST',
		});
		const bodyParams = new URLSearchParams(String(submitInit?.body ?? ''));
		const values = new Map<string, string>();
		for (const [name, value] of bodyParams.entries()) {
			values.set(name, value);
		}

		expect(values.get('hmac')).toBe('token123');
		expect(values.get('acct')).toBe('alice');
		expect(values.get('noprocrast')).toBe('t');
		expect(values.has('showdead')).toBe(false);
		expect(values.get('topc')).toBe('FA61FF');
		expect(reloadMock).toHaveBeenCalledTimes(1);

		fetchMock.mockRestore();
		reloadMock.mockRestore();
	});

	it('hides save button when fetched settings form has no topc input', async () => {
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
					</form>
				</body>
			</html>
		`;

		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(userSettingsHtml, { status: 200 }))
			.mockResolvedValueOnce(new Response('', { status: 200 }));

		await topcolorsTemplate(document);
		await flushEffects();

		expect(document.querySelector('.oj-topcolors__save-button')).toBeNull();
		expect(fetchMock).toHaveBeenCalledTimes(1);

		fetchMock.mockRestore();
	});

	it('hides save button when fetched user page has no forms', async () => {
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
					<div>No editable form here</div>
				</body>
			</html>
		`;

		const fetchMock = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(userSettingsHtml, { status: 200 }))
			.mockResolvedValueOnce(new Response('', { status: 200 }));

		await topcolorsTemplate(document);
		await flushEffects();

		expect(document.querySelector('.oj-topcolors__save-button')).toBeNull();
		expect(fetchMock).toHaveBeenCalledTimes(1);

		fetchMock.mockRestore();
	});
});
