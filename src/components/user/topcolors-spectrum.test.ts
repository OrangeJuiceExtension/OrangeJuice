import { describe, expect, it } from 'vitest';
import { arrangeSpectrum, SPECTRUM_COLUMNS } from '@/components/user/topcolors-spectrum.ts';

describe('arrangeSpectrum', () => {
	it.each([
		{ hexes: [], name: 'empty' },
		{ hexes: ['#ff6600'], name: 'one color' },
		{ hexes: ['#ffffff', '#000000', '#f7f7ef'], name: 'only neutrals' },
		{ hexes: ['#ff6600', '#0000ff', '#ffffff', '#ff0000', '#00ff00'], name: 'mixed colors' },
	])('preserves every color and its original rank: $name', ({ hexes }) => {
		const colors = arrangeSpectrum(hexes);
		expect(colors.map(({ hex }) => hex)).toEqual(hexes);
		expect(colors.map(({ rank }) => rank)).toEqual(hexes.map((_, index) => index + 1));
	});

	it('orders the spectrum by hue and separates low-chroma colors', () => {
		const colors = arrangeSpectrum([
			'#0000ff',
			'#00ff00',
			'#ff0000',
			'#ffffff',
			'#f7f7ef',
			'#100000',
		]);
		expect(colors.filter(({ neutral }) => neutral).map(({ hex }) => hex)).toEqual([
			'#ffffff',
			'#f7f7ef',
			'#100000',
		]);
		expect(
			colors
				.filter(({ neutral }) => !neutral)
				.sort((a, b) => a.orders.wide - b.orders.wide)
				.map(({ hex }) => hex)
		).toEqual(['#ff0000', '#00ff00', '#0000ff']);
	});

	it.each(
		Object.entries(SPECTRUM_COLUMNS)
	)('builds unique positions with light-to-dark columns at %s size', (size, columns) => {
		const hexes = Array.from(
			{ length: 101 },
			(_, index) => `#${(50 + index * 2).toString(16).padStart(2, '0')}0000`
		);
		const colors = arrangeSpectrum(hexes);
		const getOrder = (color: (typeof colors)[number]): number =>
			color.orders[size as keyof typeof SPECTRUM_COLUMNS];
		expect(new Set(colors.map(getOrder)).size).toBe(hexes.length);
		for (let column = 0; column < columns; column += 1) {
			const shades = colors
				.filter((color) => getOrder(color) % columns === column)
				.sort((a, b) => getOrder(a) - getOrder(b));
			expect(shades.map(({ lightness }) => lightness)).toEqual(
				shades.map(({ lightness }) => lightness).sort((a, b) => b - a)
			);
		}
	});
});
