import type { ContentScriptContext } from '#imports';

const TITLE_LENGTH_LIMIT = 80;

export function updateCharacterCount(titleInput: HTMLInputElement, doc: Document): EventListener {
	const span = doc.createElement('span');
	titleInput.parentElement?.append(span);

	const inputListener = () => {
		const length = titleInput.value.length;
		span.innerHTML =
			length <= TITLE_LENGTH_LIMIT ? `${TITLE_LENGTH_LIMIT - length} remaining` : '';
	};
	titleInput.addEventListener('input', inputListener);

	return inputListener;
}

export function remaining(ctx: ContentScriptContext, doc: Document): void {
	const titleInput = doc.querySelector<HTMLInputElement>('input[name="title"]');
	if (!titleInput) {
		return;
	}

	const listener = updateCharacterCount(titleInput, doc);

	ctx.onInvalidated(() => {
		titleInput.removeEventListener('input', listener);
	});
}
