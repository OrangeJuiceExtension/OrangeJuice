import type { ContentScriptContext } from '#imports';
import {
	createDropdown,
	createDropdownStyle,
	NAVBAR_DROPDOWN_CLASS,
} from '@/components/common/dropdown';
import { getFollowingPageUrl } from '@/utils/paths.ts';

const linkDetails = [
	{
		description: 'Users with most karma',
		title: 'leaders',
	},
	{
		description: 'Recent activity from followed users',
		href: getFollowingPageUrl(),
		title: 'following',
	},
	{
		description: 'Highest-voted recent stories',
		title: 'best',
	},
	{
		description: 'Second chance pool',
		title: 'pool',
	},
	{
		description: 'Most active current discussions',
		title: 'active',
	},
	{
		description: 'Create a new poll',
		title: 'newpoll',
	},
	{
		description: 'Show HN new stories',
		title: 'shownew',
	},
	{
		description: 'Ask HN new stories',
		title: 'asknew',
	},
	{
		description: 'Show Launch HN stories',
		title: 'launches',
	},
	{
		description: 'Invited stories',
		title: 'invited',
	},
	{
		description: 'Classic stories',
		title: 'classic',
	},
	{
		description: "Who's hiring",
		href: '/submitted?id=whoishiring',
		title: 'whoishiring',
	},
	{
		description: 'Highest-voted recent comments',
		title: 'bestcomments',
	},
	{
		description: 'Highlighted comments',
		title: 'highlights',
	},
	{
		description: 'Submissions from new accounts',
		title: 'noobstories',
	},
	{
		description: 'Comments from new accounts',
		title: 'noobcomments',
	},
	{
		description: 'List of custom topcolors',
		title: 'topcolors',
	},
];

const COMPONENT_NAME = 'oj_more_links_dropdown';
const TRAILING_SLASHES_PATTERN = /\/+$/;
const normalizePathname = (value: string): string =>
	value.replace(TRAILING_SLASHES_PATTERN, '') || '/';
const isSameOriginLink = (url: URL): boolean => url.origin === window.location.origin;

export const moreLinksDropdown = (
	ctx: ContentScriptContext,
	doc: Document,
	navbar: HTMLElement | null
) => {
	if (!navbar) {
		return;
	}

	const { pathname } = window.location;
	if (pathname.startsWith('/login') || pathname.startsWith('/submit')) {
		return;
	}

	const pageTop = navbar.querySelector<HTMLElement>('span.pagetop');
	if (!pageTop) {
		return;
	}

	const style = doc.createElement('style');
	style.textContent = createDropdownStyle(COMPONENT_NAME);
	doc.head.appendChild(style);

	const moreLinkSeparator = doc.createElement('span');
	moreLinkSeparator.textContent = ' | ';

	const moreLinksBtn = doc.createElement('a');
	moreLinksBtn.classList.add(`${COMPONENT_NAME}_button`);

	const dropdownEl = doc.createElement('div') as HTMLDivElement;
	dropdownEl.classList.add(COMPONENT_NAME, NAVBAR_DROPDOWN_CLASS);
	const currentPath = normalizePathname(window.location.pathname);

	for (const link of linkDetails) {
		const resolvedUrl = new URL(link.href ?? `/${link.title}`, window.location.href);
		if (
			isSameOriginLink(resolvedUrl) &&
			currentPath === normalizePathname(resolvedUrl.pathname)
		) {
			continue;
		}

		const linkEl = doc.createElement('a');
		linkEl.href = resolvedUrl.toString();
		linkEl.textContent = link.title;
		linkEl.title = link.description;

		dropdownEl.append(linkEl);
	}

	const updateButtonText = (isOpen: boolean) => {
		moreLinksBtn.textContent = `more ${isOpen ? '▴' : '▾'}`;
	};

	pageTop.append(moreLinkSeparator, moreLinksBtn);
	pageTop.closest('table')?.parentElement?.append(dropdownEl);

	updateButtonText(false);

	createDropdown({
		ctx,
		doc,
		dropdownElement: dropdownEl,
		onToggle: updateButtonText,
		triggerElement: moreLinksBtn,
	});
};
