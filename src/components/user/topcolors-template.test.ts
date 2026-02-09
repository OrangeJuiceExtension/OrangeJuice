import { beforeEach, describe, expect, it, vi } from 'vitest';
import { topcolorsTemplate } from '@/components/user/topcolors-template.tsx';

const flushEffects = async () => {
	await new Promise((resolve) => setTimeout(resolve, 0));
};

describe('topcolorsTemplate', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		vi.clearAllMocks();
	});

	it('does nothing on non-topcolors pages', () => {
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

		topcolorsTemplate(document);

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

		topcolorsTemplate(document);
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

		topcolorsTemplate(document);
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
});
