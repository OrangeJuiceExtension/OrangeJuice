export const SPECTRUM_COLUMNS = { medium: 24, small: 12, wide: 32 } as const;
const MIN_SPECTRUM_CHROMA = 0.08;
const MIN_SPECTRUM_SATURATION = 0.4;
const HUE_SECTOR_DEGREES = 60;
const FULL_CIRCLE_DEGREES = 360;
const RGB_MAX = 255;

export interface SpectrumColor {
	hex: string;
	hue: number;
	lightness: number;
	neutral: boolean;
	orders: Record<keyof typeof SPECTRUM_COLUMNS, number>;
	rank: number;
}

const describeColor = (hex: string, index: number): SpectrumColor => {
	const channels = [1, 3, 5].map(
		(start) => Number.parseInt(hex.slice(start, start + 2), 16) / RGB_MAX
	);
	const [red, green, blue] = channels;
	const max = Math.max(...channels);
	const min = Math.min(...channels);
	const chroma = max - min;
	const lightness = (max + min) / 2;
	// Relative saturation catches tinted grays while keeping colorful pastels and deep shades.
	const saturation = chroma === 0 ? 0 : chroma / (1 - Math.abs(2 * lightness - 1));
	let hue = 0;
	if (chroma > 0) {
		if (max === red) {
			hue = (green - blue) / chroma;
		} else if (max === green) {
			hue = (blue - red) / chroma + 2;
		} else {
			hue = (red - green) / chroma + 4;
		}
	}
	return {
		hex,
		hue: (hue * HUE_SECTOR_DEGREES + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES,
		lightness,
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
		for (let column = 0; column < columns; column += 1) {
			const start = Math.floor((column * spectrum.length) / columns);
			const end = Math.floor(((column + 1) * spectrum.length) / columns);
			const shades = spectrum
				.slice(start, end)
				.sort((a, b) => b.lightness - a.lightness || a.hue - b.hue || a.rank - b.rank);
			for (const [row, color] of shades.entries()) {
				color.orders[size] = row * columns + column;
			}
		}
	}
	return colors;
};
