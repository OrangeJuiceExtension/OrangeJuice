import DOMPurify from 'dompurify';
import type { ContentScriptContext } from '#imports';
import {
	createDropdown,
	createDropdownStyle,
	NAVBAR_DROPDOWN_CLASS,
} from '@/components/common/dropdown';

interface DropdownLink {
	title: string;
	path: string;
}

const TRAILING_PIPE_REGEX = /\|\s*$/;

const getLinks = (user: string, logoutPath?: string): DropdownLink[] => {
	const links: DropdownLink[] = [
		{
			title: 'profile',
			path: `/user?id=${user}`,
		},
		{
			title: 'submissions',
			path: `/submitted?id=${user}`,
		},
		{
			title: 'comments',
			path: `/threads?id=${user}`,
		},
		{
			title: 'hidden',
			path: '/hidden',
		},
		{
			title: 'flagged submissions',
			path: `/flagged?id=${user}`,
		},
		{
			title: 'flagged comments',
			path: `/flagged?id=${user}&kind=comment`,
		},
		{
			title: 'upvoted submissions',
			path: `/upvoted?id=${user}`,
		},
		{
			title: 'upvoted comments',
			path: `/upvoted?id=${user}&comments=t`,
		},
		{
			title: 'favorite submissions',
			path: `/favorites?id=${user}`,
		},
		{
			title: 'favorite comments',
			path: `/favorites?id=${user}&comments=t`,
		},
	];

	if (logoutPath) {
		links.push({
			title: 'logout',
			path: logoutPath,
		});
	}

	return links;
};

const removeTopLogoutLink = (pageTop: Element): string | undefined => {
	const logoutLink = pageTop.querySelector<HTMLAnchorElement>('a[href*="logout"]');
	if (!logoutLink) {
		return undefined;
	}

	const logoutPath = logoutLink.getAttribute('href') ?? undefined;
	const previousSibling = logoutLink.previousSibling;
	if (previousSibling && previousSibling.nodeType === Node.TEXT_NODE) {
		previousSibling.textContent = (previousSibling.textContent ?? '')
			.replace(TRAILING_PIPE_REGEX, '')
			.trimEnd();
		if (!previousSibling.textContent) {
			previousSibling.remove();
		}
	}
	logoutLink.remove();
	return logoutPath;
};

const COMPONENT_NAME = 'oj_profile_dropdown';
export const profileLinksDropdown = (ctx: ContentScriptContext, doc: Document) => {
	if (window.location.pathname.startsWith('/user')) {
		return;
	}

	// There are multiple pagetops and we want the second one
	const pageTop = doc.querySelectorAll('.pagetop');
	if (pageTop.length < 2) {
		return;
	}

	const userLink = pageTop[1].querySelector<HTMLAnchorElement>('a#me');
	if (!userLink) {
		return false;
	}

	const userName = DOMPurify.sanitize(userLink.innerText);
	const logoutPath = removeTopLogoutLink(pageTop[1]);

	const style = doc.createElement('style');
	style.innerHTML = createDropdownStyle(COMPONENT_NAME);
	doc.head.appendChild(style);

	const dropdownEl = doc.createElement('div') as HTMLDivElement;
	dropdownEl.classList.add(COMPONENT_NAME, NAVBAR_DROPDOWN_CLASS);

	const updateUserLinkText = (isOpen: boolean) => {
		userLink.innerHTML = `${userName} ${isOpen ? '▴' : '▾'}`;
	};

	userLink.classList.add(`${COMPONENT_NAME}_button`);

	for (const link of getLinks(userName, logoutPath)) {
		const anchorEl = doc.createElement('a') as HTMLAnchorElement;
		anchorEl.href = link.path;
		anchorEl.innerHTML = link.title;
		dropdownEl.append(anchorEl);
	}

	pageTop[1].closest('table')?.parentElement?.append(dropdownEl);

	updateUserLinkText(false);

	createDropdown({
		triggerElement: userLink,
		dropdownElement: dropdownEl,
		doc,
		ctx,
		onToggle: updateUserLinkText,
	});
};
