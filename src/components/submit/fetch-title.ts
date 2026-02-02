import type { ContentScriptContext } from '#imports';
import { createClientServices } from '@/services/manager.ts';
import { WORKER_BASE } from '@/utils/api.ts';

interface Title {
	title: string;
}

export const fetchTitle = (ctx: ContentScriptContext, doc: Document) => {
	const titleInput = document.querySelector<HTMLInputElement>('input[name="title"]');
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
	fetchTitleBtn.innerText = 'fetch title';

	const fetchTitleHandler = async (e: Event) => {
		e.stopPropagation();
		e.preventDefault();
		fetchTitleBtn.disabled = true;

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
		} catch (e) {
			console.error('Error fetching title:', e);
		} finally {
			fetchTitleBtn.disabled = false;
		}
	};
	fetchTitleBtn.addEventListener('click', fetchTitleHandler);

	urlInputParent.append(fetchTitleBtn);

	ctx.onInvalidated(() => {
		fetchTitleBtn.removeEventListener('click', fetchTitleHandler);
	});
};
