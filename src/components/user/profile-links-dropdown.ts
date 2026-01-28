import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { isClickModified } from '@/utils/dom.ts';

const pageStyle = `
	.oj_profile_dropdown {
		border: 1px solid #000;
		margin-top: 0px;
		position: absolute;
		background-color: #fff;
		white-space: nowrap;
	}
	
	.oj_profile_dropdown a,	.oj_profile_dropdown a:visited {
		display: block;
		text-align: left;
		text-decoration: underline;
		height: 20px;
		padding: 0 5px;
		color: #000;
	}
`;

const getLinks = (user: string) => {
	return [
		{
			title: 'profile',
			path: `user?id=${user}`,
		},
		{
			title: 'submissions',
			path: `submitted?id=${user}`,
		},
		{
			title: 'comments',
			path: `threads?id=${user}`,
		},
		{
			title: 'hidden',
			path: 'hidden',
		},
		{
			title: 'upvoted submissions',
			path: `upvoted?id=${user}`,
		},
		{
			title: 'upvoted comments',
			path: `upvoted?id=${user}&comments=t`,
		},
		{
			title: 'favorite submissions',
			path: `favorites?id=${user}`,
		},
		{
			title: 'favorite comments',
			path: `favorites?id=${user}&comments=t`,
		},
	];
};

export const profileLinksDropdown = (doc: Document, ctx: ContentScriptContext) => {
	if (window.location.pathname.startsWith('/user')) {
		return;
	}

	// There are multiple pagetops and we want the second one
	const pageTop = doc.querySelectorAll('span.pagetop');
	if (pageTop.length < 2) {
		return;
	}

	const userLink = pageTop[1].querySelector<HTMLAnchorElement>('a#me');
	if (!userLink) {
		return false;
	}

	const style = doc.createElement('style');
	style.innerHTML = pageStyle;
	doc.head.appendChild(style);

	const userName = userLink.innerText;

	const dropdownEl = doc.createElement('div') as HTMLDivElement;
	dropdownEl.style.display = 'none';
	dropdownEl.classList.add('oj_profile_dropdown');

	let openState = 0;

	const updateUserLinkText = () => {
		userLink.innerHTML = `${userName} ${openState ? '▴' : '▾'}`;
	};

	for (const link of getLinks(userName)) {
		const anchorEl = doc.createElement('a') as HTMLAnchorElement;
		anchorEl.href = link.path;
		anchorEl.innerHTML = link.title;
		dropdownEl.append(anchorEl);
	}

	pageTop[1].closest('table')?.parentElement?.append(dropdownEl);

	updateUserLinkText();

	const clickHandler = (event: MouseEvent) => {
		if (isClickModified(event)) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		dropdownEl.style.left = `${userLink.getBoundingClientRect().left}px`;
		const display = dropdownEl.style.display;
		dropdownEl.style.display = display === 'none' ? 'block' : 'none';
		openState = 1 - openState;
		updateUserLinkText();
	};

	userLink.addEventListener('click', clickHandler);

	const outsideClickHandler = (event: MouseEvent) => {
		if (openState === 0) {
			return;
		}

		const target = event.target as Node;
		if (!(dropdownEl.contains(target) || userLink.contains(target))) {
			dropdownEl.style.display = 'none';
			openState = 1 - openState;
			updateUserLinkText();
		}
	};
	doc.addEventListener('click', outsideClickHandler);

	const resizeHandler = (_e: Event) => {
		if (openState > 0) {
			dropdownEl.style.left = `${userLink.getBoundingClientRect().left}px`;
		}
	};
	window.addEventListener('resize', resizeHandler);

	ctx.onInvalidated(() => {
		userLink.removeEventListener('click', clickHandler);
		doc.removeEventListener('click', outsideClickHandler);
		window.removeEventListener('resize', resizeHandler);
	});
};
