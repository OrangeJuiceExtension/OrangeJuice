import type { ContentScriptContext } from '#imports';
import { createClientServices } from '@/services/manager.ts';
import { WORKER_BASE } from '@/utils/api.ts';

interface Title {
	title: string;
}

const FETCH_TITLE_LABEL = 'fetch title';
const FETCHING_TITLE_LABEL = 'fetching...';

export const fetchTitle = (ctx: ContentScriptContext, doc: Document): void => {
	const titleInput = doc.querySelector<HTMLInputElement>('input[name="title"]');
	if (!titleInput) {
		return;
	}

	const urlInput = doc.querySelector<HTMLInputElement>('input[name="url"]');
	if (!urlInput) {
		return;
	}

	const urlInputParent = urlInput.parentElement;
	if (!urlInputParent) {
		return;
	}

	const fetchTitleBtn = doc.createElement('button');
	fetchTitleBtn.style.paddingLeft = '10px';
	fetchTitleBtn.classList.add('oj_link_button');
	fetchTitleBtn.innerText = FETCH_TITLE_LABEL;

	const fetchTitleHandler = async (e: Event): Promise<void> => {
		e.stopPropagation();
		e.preventDefault();
		fetchTitleBtn.disabled = true;
		fetchTitleBtn.innerText = FETCHING_TITLE_LABEL;

		try {
			let { value } = urlInput;
			value = value.trim();
			if (!value.length) {
				return;
			}
			if (!value.startsWith('http')) {
				value = `https://${value}`;
			}

			const service = createClientServices().getFetchRemoteService();
			const url = `${WORKER_BASE}/title?url=${encodeURIComponent(value)}`;
			const result = await service.fetchJson(url);
			if (!result) {
				return;
			}

			const title = result as Title;
			titleInput.value = title.title;
			titleInput.dispatchEvent(new Event('input', { bubbles: true }));
		} catch (e) {
			console.error('Error fetching title:', e);
		} finally {
			fetchTitleBtn.disabled = false;
			fetchTitleBtn.innerText = FETCH_TITLE_LABEL;
		}
	};
	fetchTitleBtn.addEventListener('click', fetchTitleHandler);

	urlInputParent.append(fetchTitleBtn);

	ctx.onInvalidated(() => {
		fetchTitleBtn.removeEventListener('click', fetchTitleHandler);
	});
};
