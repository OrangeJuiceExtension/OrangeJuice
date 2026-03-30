import { version } from '../../../package.json';
import '../../utils/dark-mode.css';
import './hn-template.css';

const TEMPLATE_ROOT_ID = 'oj-hn-template-root';

const createAnchor = (doc: Document, href: string, text: string): HTMLAnchorElement => {
	const link = doc.createElement('a');
	link.href = href;
	link.textContent = text;
	return link;
};

const createDefaultNav = (doc: Document): HTMLTableElement => {
	const table = doc.createElement('table');
	table.border = '0';
	table.cellPadding = '0';
	table.cellSpacing = '0';
	table.className = 'oj-hn-nav-table';

	const tbody = doc.createElement('tbody');
	const row = doc.createElement('tr');

	const logoCell = doc.createElement('td');
	logoCell.className = 'oj-hn-logo-cell';
	const logoLink = doc.createElement('a');
	logoLink.href = 'https://news.ycombinator.com';
	const logo = doc.createElement('img');
	logo.alt = 'Hacker News';
	logo.height = 18;
	logo.src = '/y18.svg';
	logo.style.border = '1px white solid';
	logo.style.display = 'block';
	logo.width = 18;
	logoLink.append(logo);
	logoCell.append(logoLink);

	const linksCell = doc.createElement('td');
	linksCell.className = 'oj-hn-links-cell';
	const pageTop = doc.createElement('span');
	pageTop.className = 'pagetop';
	const name = doc.createElement('b');
	name.className = 'hnname';
	name.append(createAnchor(doc, '/news', 'Hacker News'));
	pageTop.append(name, '\u00a0');
	linksCell.append(pageTop);

	const loginCell = doc.createElement('td');
	loginCell.className = 'oj-hn-login-cell';

	row.append(logoCell, linksCell, loginCell);
	tbody.append(row);
	table.append(tbody);
	return table;
};

const createDefaultFooter = (doc: Document): HTMLDivElement => {
	const footer = doc.createElement('div');
	footer.className = 'oj-hn-footer-center';

	const table = doc.createElement('table');
	table.cellPadding = '1';
	table.cellSpacing = '0';
	table.width = '100%';
	const tbody = doc.createElement('tbody');
	const row = doc.createElement('tr');
	const stripe = doc.createElement('td');
	stripe.style.backgroundColor = '#ff6600';
	stripe.style.height = '2px';
	row.append(stripe);
	tbody.append(row);
	table.append(tbody);

	const links = doc.createElement('span');
	links.className = 'yclinks';

	const footerLinks = [
		['/newsguidelines.html', 'Guidelines'],
		['/newsfaq.html', 'FAQ'],
		['/lists', 'Lists'],
		['https://github.com/HackerNews/API', 'API'],
		['/security.html', 'Security'],
		['https://www.ycombinator.com/legal/', 'Legal'],
		['https://www.ycombinator.com/apply/', 'Apply to YC'],
		['mailto:hn@ycombinator.com', 'Contact'],
	] as const;

	for (const [index, [href, text]] of footerLinks.entries()) {
		links.append(createAnchor(doc, href, text));
		if (index < footerLinks.length - 1) {
			links.append(' | ');
		}
	}

	const orangeJuiceLink = createAnchor(doc, 'https://oj-hn.com', 'Orange Juice');
	orangeJuiceLink.rel = 'noopener noreferrer';
	orangeJuiceLink.target = '_blank';
	orangeJuiceLink.title = version;
	links.append(' | ', orangeJuiceLink);

	footer.append(table, doc.createElement('br'), links);
	return footer;
};

interface WrapOptions {
	footer?: Node;
	nav?: Node;
}

export const wrapBodyWithHnTemplate = (doc: Document, options: WrapOptions = {}): void => {
	if (doc.getElementById(TEMPLATE_ROOT_ID)) {
		return;
	}

	const existingBodyNodes = Array.from(doc.body.childNodes);
	const root = doc.createElement('div');
	root.id = TEMPLATE_ROOT_ID;

	const page = doc.createElement('div');
	page.className = 'oj-hn-template';

	const table = doc.createElement('table');
	table.border = '0';
	table.cellPadding = '0';
	table.cellSpacing = '0';
	table.className = 'oj-hn-page';
	table.width = '100%';

	const tbody = doc.createElement('tbody');
	const navRow = doc.createElement('tr');
	const navCell = doc.createElement('td');
	navCell.className = 'oj-hn-nav';
	navCell.append((options.nav?.cloneNode(true) as Node | undefined) ?? createDefaultNav(doc));
	navRow.append(navCell);

	const bodyRow = doc.createElement('tr');
	const bodyCell = doc.createElement('td');
	bodyCell.className = 'oj-hn-body';
	for (const node of existingBodyNodes) {
		bodyCell.append(node);
	}
	bodyRow.append(bodyCell);

	const footerRow = doc.createElement('tr');
	const footerCell = doc.createElement('td');
	footerCell.className = 'oj-hn-footer';
	footerCell.append(
		(options.footer?.cloneNode(true) as Node | undefined) ?? createDefaultFooter(doc)
	);
	footerRow.append(footerCell);

	tbody.append(navRow, bodyRow, footerRow);
	table.append(tbody);
	page.append(table);
	root.append(page);

	doc.body.replaceChildren(root);
};
