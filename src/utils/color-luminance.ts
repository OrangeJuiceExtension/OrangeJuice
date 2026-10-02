const RGB_MAX = 255;
const SRGB_LINEAR_THRESHOLD = 0.040_45;
const SRGB_LINEAR_SCALE = 12.92;
const SRGB_CURVE_OFFSET = 0.055;
const SRGB_CURVE_SCALE = 1.055;
const SRGB_GAMMA = 2.4;
const LUMINANCE_WEIGHTS = { blue: 0.0722, green: 0.7152, red: 0.2126 } as const;

const srgbToLinear = (channel: number): number => {
	const normalized = channel / RGB_MAX;
	if (normalized <= SRGB_LINEAR_THRESHOLD) {
		return normalized / SRGB_LINEAR_SCALE;
	}
	return ((normalized + SRGB_CURVE_OFFSET) / SRGB_CURVE_SCALE) ** SRGB_GAMMA;
};

/** Relative luminance of 8-bit sRGB channels, from black (0) to white (1). */
export const getRelativeLuminance = (red: number, green: number, blue: number): number =>
	LUMINANCE_WEIGHTS.red * srgbToLinear(red) +
	LUMINANCE_WEIGHTS.green * srgbToLinear(green) +
	LUMINANCE_WEIGHTS.blue * srgbToLinear(blue);
