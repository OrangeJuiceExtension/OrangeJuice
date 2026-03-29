import lStorage from '@/utils/local-storage.ts';
import './App.css';

const DARK_MODE_STORAGE_KEY = 'oj_dark_mode';
const LOGO_PATH = 'https://oj-hn.com/assets/image-128.png';

type PopupTheme = 'dark' | 'light';

const isPopupTheme = (value: unknown): value is PopupTheme => {
	return value === 'dark' || value === 'light';
};

const createPopupContent = (doc: Document): HTMLElement => {
	const main = doc.createElement('main');
	main.className = 'oj-popup oj-popup--light';

	const card = doc.createElement('section');
	card.className = 'oj-popup__card';

	const logo = doc.createElement('img');
	logo.alt = 'Orange Juice logo';
	logo.className = 'oj-popup__logo';
	logo.height = 128;
	logo.src = LOGO_PATH;
	logo.width = 128;

	const title = doc.createElement('h1');
	title.className = 'oj-popup__title';
	title.textContent = 'Coming Soon';

	const text = doc.createElement('p');
	text.className = 'oj-popup__text';
	text.textContent = 'The Orange Juice popup is on the way. Suggestions welcome!';

	card.append(logo, title, text);
	main.append(card);
	return main;
};

export const renderPopupApp = async (doc: Document, root: HTMLElement): Promise<void> => {
	const popup = createPopupContent(doc);
	root.replaceChildren(popup);

	const storedTheme = await lStorage.getItem<PopupTheme>(DARK_MODE_STORAGE_KEY);
	if (isPopupTheme(storedTheme)) {
		popup.className = `oj-popup oj-popup--${storedTheme}`;
	}
};
