const withRendererGlobal = (render: () => string): string => {
	const runtime = globalThis as { global?: typeof globalThis };
	if (runtime.global !== undefined) {
		return render();
	}

	// ELK's synchronous adapter temporarily removes `self` while initializing.
	// Supply its Node-style fallback in service workers, then restore the global scope.
	const descriptor = Object.getOwnPropertyDescriptor(runtime, 'global');
	Object.defineProperty(runtime, 'global', { configurable: true, value: globalThis });
	try {
		return render();
	} finally {
		if (descriptor) {
			Object.defineProperty(runtime, 'global', descriptor);
		} else {
			Reflect.deleteProperty(runtime, 'global');
		}
	}
};

export class MermaidService {
	async render(code: string, dark: boolean): Promise<string> {
		const { renderMermaidSVG, THEMES } = await import('beautiful-mermaid');
		return withRendererGlobal(() =>
			renderMermaidSVG(code, THEMES[dark ? 'github-dark' : 'github-light'])
		);
	}
}
