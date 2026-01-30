import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createServicesManager } from '@/services/manager.ts';
import { WORKER_BASE } from '@/utils/api.ts';
import { dom } from '@/utils/dom.ts';

interface Title {
	title: string;
}

export const fetchTitle = (doc: Document, ctx: ContentScriptContext) => {
	const titleInput = document.querySelector<HTMLInputElement>('input[name="title"]');
	if (!titleInput) {
		return;
	}

	const urlInput = doc.querySelector<HTMLInputElement>('input[name="url"]');
	if (!urlInput) {
		return;
	}
	dom.injectLinkButtonStyle(doc);

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
			if (!(value.length && value.startsWith('http'))) {
				return;
			}

			const service = createServicesManager().getFetchRemoteService();
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
