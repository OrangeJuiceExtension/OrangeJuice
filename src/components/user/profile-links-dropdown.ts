import type { ContentScriptContext } from '#imports';
import {
	createDropdown,
	createDropdownStyle,
	NAVBAR_DROPDOWN_CLASS,
} from '@/components/common/dropdown';
import { paths } from '@/utils/paths.ts';

interface DropdownLink {
	path: string;
	title: string;
}

const TRAILING_PIPE_REGEX = /\|\s*$/;
const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

const createUserPath = (
	pathname: string,
	user: string,
	extraParams?: Record<string, string>
): string => {
	const url = new URL(pathname, paths.base);
	url.searchParams.set('id', user);

	if (extraParams) {
		for (const [key, value] of Object.entries(extraParams)) {
			url.searchParams.set(key, value);
		}
	}

	return `${url.pathname}${url.search}`;
};

const getSafeRelativePath = (path: string): string | undefined => {
	try {
		const resolved = new URL(path, paths.base);
		if (!SAFE_PROTOCOLS.has(resolved.protocol)) {
			return undefined;
		}
		if (resolved.origin !== new URL(paths.base).origin) {
			return undefined;
		}
		return `${resolved.pathname}${resolved.search}${resolved.hash}`;
	} catch {
		return undefined;
	}
};

const getLinks = (user: string, logoutPath?: string): DropdownLink[] => {
	const links: DropdownLink[] = [
		{
			title: 'profile',
			path: createUserPath('/user', user),
		},
		{
			title: 'submissions',
			path: createUserPath('/submitted', user),
		},
		{
			title: 'comments',
			path: createUserPath('/threads', user),
		},
		{
			title: 'hidden',
			path: '/hidden',
		},
		{
			title: 'flagged submissions',
			path: createUserPath('/flagged', user),
		},
		{
			title: 'flagged comments',
			path: createUserPath('/flagged', user, { kind: 'comment' }),
		},
		{
			title: 'upvoted submissions',
			path: createUserPath('/upvoted', user),
		},
		{
			title: 'upvoted comments',
			path: createUserPath('/upvoted', user, { comments: 't' }),
		},
		{
			title: 'favorite submissions',
			path: createUserPath('/favorites', user),
		},
		{
			title: 'favorite comments',
			path: createUserPath('/favorites', user, { comments: 't' }),
		},
	];

	const safeLogoutPath = logoutPath ? getSafeRelativePath(logoutPath) : undefined;
	if (safeLogoutPath) {
		links.push({
			title: 'logout',
			path: safeLogoutPath,
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

	const userName = userLink.innerText.trim();
	const logoutPath = removeTopLogoutLink(pageTop[1]);

	const style = doc.createElement('style');
	style.textContent = createDropdownStyle(COMPONENT_NAME);
	doc.head.appendChild(style);

	const dropdownEl = doc.createElement('div') as HTMLDivElement;
	dropdownEl.classList.add(COMPONENT_NAME, NAVBAR_DROPDOWN_CLASS);

	const updateUserLinkText = (isOpen: boolean) => {
		userLink.textContent = `${userName} ${isOpen ? '▴' : '▾'}`;
	};

	userLink.classList.add(`${COMPONENT_NAME}_button`);

	for (const link of getLinks(userName, logoutPath)) {
		const anchorEl = doc.createElement('a') as HTMLAnchorElement;
		anchorEl.href = link.path;
		anchorEl.textContent = link.title;
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
