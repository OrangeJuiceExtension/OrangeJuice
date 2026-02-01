import type { ContentScriptContext } from '#imports';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

export function updateCharacterCount(titleInput: HTMLInputElement): EventListener | undefined {
	const titleLengthLimit = 80;

	const span = document.createElement('span');
	titleInput.parentElement?.append(span);

	const inputListener = () => {
		const length = titleInput.value.length;
		span.innerHTML = length <= titleLengthLimit ? `${titleLengthLimit - length} remaining` : '';
	};
	titleInput.addEventListener('input', inputListener);

	return inputListener;
}

export const remaining: ComponentFeature = {
	id: 'remaining',
	loginRequired: true,
	matches: [`${paths.base}/submit`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		const titleInput = document.querySelector<HTMLInputElement>('input[name="title"]');
		if (!titleInput) {
			return;
		}

		const listener = updateCharacterCount(titleInput);

		// Clean up listeners
		ctx.onInvalidated(() => {
			if (listener) {
				titleInput.removeEventListener('click', listener);
			}
		});
	},
};
