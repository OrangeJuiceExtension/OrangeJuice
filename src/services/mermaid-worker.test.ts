import { createContext, runInContext } from 'node:vm';
import { build } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';

interface WorkerRenderer {
	render: (code: string, dark: boolean) => Promise<string>;
}

let workerBundle: string;

describe('Mermaid service worker compatibility', () => {
	beforeAll(async () => {
		// Use the browser bundle, including ELK, rather than Node's dependency exports.
		const result = await build({
			build: {
				lib: {
					entry: `${import.meta.dirname}/mermaid-service.ts`,
					formats: ['iife'],
					name: 'MermaidWorkerTest',
				},
				minify: false,
				write: false,
			},
			configFile: false,
			logLevel: 'silent',
		});
		const [bundle] = Array.isArray(result) ? result : [result];
		if (!(bundle && 'output' in bundle)) {
			throw new Error('Expected one browser bundle');
		}
		const entry = bundle.output.find((output) => output.type === 'chunk' && output.isEntry);
		if (entry?.type !== 'chunk') {
			throw new Error('Missing browser bundle entry');
		}
		workerBundle = entry.code;
	});

	it.each([{ dark: false }, { dark: true }])(
		'renders and recovers from invalid markup in a worker with dark=$dark',
		async ({ dark }) => {
			const worker = createContext(
				{ atob, btoa, clearTimeout, console, setTimeout },
				{ codeGeneration: { strings: false, wasm: false } }
			);
			runInContext('globalThis.self = globalThis;', worker);
			runInContext(workerBundle, worker, { timeout: 5000 });
			const renderer = runInContext(
				'new MermaidWorkerTest.MermaidService()',
				worker
			) as WorkerRenderer;
			const svg = await renderer.render('graph TD\nA --> B', dark);
			expect(svg).toContain('<svg');
			expect(svg).toContain(dark ? '#0d1117' : '#ffffff');
			await expect(renderer.render('not a diagram', dark)).rejects.toThrow();
			await expect(renderer.render('graph TD\nC --> D', dark)).resolves.toContain('<svg');
			expect(runInContext('self === globalThis', worker)).toBe(true);
			expect(runInContext('typeof global', worker)).toBe('undefined');
			expect(runInContext("Object.hasOwn(globalThis, 'global')", worker)).toBe(false);
		}
	);
});
