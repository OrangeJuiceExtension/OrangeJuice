import { describe, expect, it } from 'vitest';
import { MermaidService } from '@/services/mermaid-service.ts';

describe('MermaidService', () => {
	it.each([
		{ background: '#ffffff', dark: false },
		{ background: '#0d1117', dark: true },
	])(
		'renders SVG markup for dark=$dark with the selected theme',
		async ({ dark, background }) => {
			const svg = await new MermaidService().render('graph TD\nA --> B', dark);
			expect(svg).toContain('<svg');
			expect(svg).toContain(background);
			expect(svg).toContain('A');
			expect(svg).toContain('B');
		}
	);

	it('rejects malformed diagrams', async () => {
		await expect(new MermaidService().render('not a diagram', false)).rejects.toThrow();
	});
});
