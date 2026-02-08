const HIDE_BODY_STYLE_ID = 'oj-hide-body';

export const hideBody = (doc: Document) => {
	if (doc.getElementById(HIDE_BODY_STYLE_ID)) {
		return;
	}

	const style = doc.createElement('style');
	style.id = HIDE_BODY_STYLE_ID;
	style.textContent = 'body { visibility: hidden; display: none; }';
	(doc.head ?? doc.documentElement).appendChild(style);
};

export const showBody = (doc: Document) => {
	doc.getElementById(HIDE_BODY_STYLE_ID)?.remove();
};
