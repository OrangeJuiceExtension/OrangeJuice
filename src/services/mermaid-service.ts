import { renderMermaid, THEMES } from 'beautiful-mermaid';

export class MermaidService {
	async render(code: string, dark: boolean): Promise<string> {
		return await renderMermaid(code, THEMES[dark ? 'github-dark' : 'github-light']);
	}
}
