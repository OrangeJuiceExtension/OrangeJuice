import { getRelativeLuminance } from '@/utils/color-luminance.ts';

export const SPECTRUM_COLUMNS = { medium: 24, small: 12, wide: 40 } as const;
const MIN_SPECTRUM_CHROMA = 0.08;
const MIN_SPECTRUM_SATURATION = 0.4;
const HUE_SECTOR_DEGREES = 60;
const FULL_CIRCLE_DEGREES = 360;
const RGB_MAX = 255;

export interface SpectrumColor {
	hex: string;
	hue: number;
	luminance: number;
	neutral: boolean;
	orders: Record<keyof typeof SPECTRUM_COLUMNS, number>;
	rank: number;
}

const describeColor = (hex: string, index: number): SpectrumColor => {
	const red = Number.parseInt(hex.slice(1, 3), 16);
	const green = Number.parseInt(hex.slice(3, 5), 16);
	const blue = Number.parseInt(hex.slice(5, 7), 16);
	const max = Math.max(red, green, blue);
	const min = Math.min(red, green, blue);
	const range = max - min;
	const chroma = range / RGB_MAX;
	const lightness = (max + min) / (2 * RGB_MAX);
	// Relative saturation catches tinted grays while keeping colorful pastels and deep shades.
	const saturation = chroma === 0 ? 0 : chroma / (1 - Math.abs(2 * lightness - 1));
	let hue = 0;
	if (chroma > 0) {
		if (max === red) {
			hue = (green - blue) / range;
		} else if (max === green) {
			hue = (blue - red) / range + 2;
		} else {
			hue = (red - green) / range + 4;
		}
	}
	return {
		hex,
		hue: (hue * HUE_SECTOR_DEGREES + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES,
		luminance: getRelativeLuminance(red, green, blue),
		neutral: chroma < MIN_SPECTRUM_CHROMA || saturation < MIN_SPECTRUM_SATURATION,
		orders: { medium: 0, small: 0, wide: 0 },
		rank: index + 1,
	};
};

/** Balance the columns by hue, then shade each column from light to dark. */
export const arrangeSpectrum = (hexes: string[]): SpectrumColor[] => {
	const colors = hexes.map(describeColor);
	const spectrum = colors
		.filter(({ neutral }) => !neutral)
		.sort((a, b) => a.hue - b.hue || a.rank - b.rank);
	for (const size of Object.keys(SPECTRUM_COLUMNS) as Array<keyof typeof SPECTRUM_COLUMNS>) {
		const columns = Math.min(SPECTRUM_COLUMNS[size], spectrum.length);
		if (columns === 0) {
			continue;
		}
		const baseColumnHeight = Math.floor(spectrum.length / columns);
		const tallerColumns = spectrum.length % columns;
		for (let column = 0; column < columns; column += 1) {
			// Fill the last row from the left so CSS grid cannot shift swatches into other hues.
			const start = column * baseColumnHeight + Math.min(column, tallerColumns);
			const end = start + baseColumnHeight + (column < tallerColumns ? 1 : 0);
			const shades = spectrum
				.slice(start, end)
				.sort((a, b) => b.luminance - a.luminance || a.hue - b.hue || a.rank - b.rank);
			for (const [row, color] of shades.entries()) {
				color.orders[size] = row * columns + column;
			}
		}
	}
	return colors;
};
