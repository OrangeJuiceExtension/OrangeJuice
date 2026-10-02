import { describe, expect, it } from 'vitest';
import { arrangeSpectrum, SPECTRUM_COLUMNS } from '@/components/user/topcolors-spectrum.ts';

const BRIGHTNESS_CASES = [
	{ darker: '#66cc66', lighter: '#00ff00', name: 'green' },
	{ darker: '#cccc66', lighter: '#ffff00', name: 'yellow' },
	{ darker: '#66cccc', lighter: '#00ffff', name: 'cyan' },
] as const;

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

	it.each([
		{ hex: '#7a8c96', name: 'blue gray', neutral: true },
		{ hex: '#8080a0', name: 'gray lavender', neutral: true },
		{ hex: '#bc8f8f', name: 'dusty rose', neutral: true },
		{ hex: '#a77464', name: 'muted brown', neutral: true },
		{ hex: '#c3b091', name: 'khaki', neutral: true },
		{ hex: '#a6bba0', name: 'sage gray', neutral: true },
		{ hex: '#91cac4', name: 'muted teal', neutral: true },
		{ hex: '#789abc', name: 'slate blue', neutral: true },
		{ hex: '#ffffff', name: 'white', neutral: true },
		{ hex: '#000000', name: 'black', neutral: true },
		{ hex: '#888888', name: 'gray', neutral: true },
		{ hex: '#fff4f0', name: 'nearly white peach', neutral: true },
		{ hex: '#100000', name: 'nearly black red', neutral: true },
		{ hex: '#ff6600', name: 'HN orange', neutral: false },
		{ hex: '#aabbff', name: 'pastel blue', neutral: false },
		{ hex: '#ffe0e0', name: 'pastel pink', neutral: false },
		{ hex: '#6699cc', name: 'clear blue', neutral: false },
		{ hex: '#285577', name: 'deep blue', neutral: false },
		{ hex: '#008c0a', name: 'deep green', neutral: false },
	])('groups $name by colorfulness rather than brightness', ({ hex, neutral }) => {
		const [color] = arrangeSpectrum([hex]);
		expect(color.neutral).toBe(neutral);
	});

	it.each(
		Object.entries(SPECTRUM_COLUMNS).flatMap(([size, columns]) =>
			BRIGHTNESS_CASES.map((colors) => ({ ...colors, columns, size }))
		)
	)(
		'puts visibly brighter $name above darker shades at $size size',
		({ darker, lighter, columns, size }) => {
			const otherHues = Array.from(
				{ length: (columns - 1) * 2 },
				(_, index) => `#${(30 + index).toString(16).padStart(2, '0')}0000`
			);
			const colors = arrangeSpectrum([darker, lighter, ...otherHues]);
			const order = (color: (typeof colors)[number]): number =>
				color.orders[size as keyof typeof SPECTRUM_COLUMNS];
			const rendered = colors
				.filter(({ neutral }) => !neutral)
				.sort((a, b) => order(a) - order(b));
			const lightIndex = rendered.findIndex(({ hex }) => hex === lighter);
			const darkIndex = rendered.findIndex(({ hex }) => hex === darker);
			expect(lightIndex % columns).toBe(darkIndex % columns);
			expect(lightIndex).toBeLessThan(darkIndex);
		}
	);

	it.each(Object.entries(SPECTRUM_COLUMNS))(
		'builds unique positions with light-to-dark columns at %s size',
		(size, columns) => {
			const hexes = Array.from(
				{ length: 101 },
				(_, index) => `#${(50 + index * 2).toString(16).padStart(2, '0')}0000`
			);
			const colors = arrangeSpectrum(hexes);
			const getOrder = (color: (typeof colors)[number]): number =>
				color.orders[size as keyof typeof SPECTRUM_COLUMNS];
			expect(new Set(colors.map(getOrder)).size).toBe(hexes.length);
			// CSS grid fills gaps in order values, which would shift the last row into other hues.
			expect(colors.map(getOrder).sort((a, b) => a - b)).toEqual(
				hexes.map((_, index) => index)
			);
			for (let column = 0; column < columns; column += 1) {
				const shades = colors
					.filter((color) => getOrder(color) % columns === column)
					.sort((a, b) => getOrder(a) - getOrder(b));
				expect(shades.map(({ luminance }) => luminance)).toEqual(
					shades.map(({ luminance }) => luminance).sort((a, b) => b - a)
				);
			}
		}
	);
});
