import type { ContentScriptContext } from '#imports';
import { createDropdown, createDropdownStyle } from '@/components/common/dropdown';

const linkDetails = [
	{
		title: 'leaders',
		description: 'Users with most karma',
	},
	{
		title: 'best',
		description: 'Highest-voted recent stories',
	},
	{
		title: 'pool',
		description: 'Second chance pool',
	},
	{
		title: 'active',
		description: 'Most active current discussions',
	},
	{
		title: 'newpoll',
		description: 'Create a new poll',
	},
	{
		title: 'shownew',
		description: 'Show HN new stories',
	},
	{
		title: 'asknew',
		description: 'Ask HN new stories',
	},
	{
		title: 'launches',
		description: 'Show Launch HN stories',
	},
	{
		title: 'invited',
		description: 'Invited stories',
	},
	{
		title: 'classic',
		description: 'Classic stories',
	},
	{
		title: 'whoishiring',
		href: '/submitted?id=whoishiring',
		description: "Who's hiring",
	},
	{
		title: 'bestcomments',
		description: 'Highest-voted recent comments',
	},
	{
		title: 'highlights',
		description: 'Highlighted comments',
	},
	{
		title: 'noobstories',
		description: 'Submissions from new accounts',
	},
	{
		title: 'noobcomments',
		description: 'Comments from new accounts',
	},
	{
		title: 'topcolors',
		description: 'List of custom topcolors',
	},
];

const COMPONENT_NAME = 'oj_more_links_dropdown';

export const moreLinksDropdown = (
	ctx: ContentScriptContext,
	doc: Document,
	navbar: HTMLElement | null
) => {
	if (!navbar) {
		return;
	}

	const pathname = window.location.pathname;
	if (pathname.startsWith('/login') || pathname.startsWith('/submit')) {
		return;
	}

	const pageTop = navbar.querySelector<HTMLElement>('span.pagetop');
	if (!pageTop) {
		return;
	}

	const style = doc.createElement('style');
	style.innerHTML = createDropdownStyle(COMPONENT_NAME);
	doc.head.appendChild(style);

	const moreLinkSeparator = doc.createElement('span');
	moreLinkSeparator.innerHTML = ' | ';

	const moreLinksBtn = doc.createElement('a');
	moreLinksBtn.classList.add(`${COMPONENT_NAME}_button`);

	const dropdownEl = doc.createElement('div') as HTMLDivElement;
	dropdownEl.classList.add(COMPONENT_NAME);

	for (const link of linkDetails) {
		if (window.location.pathname === `/${link.title}`) {
			continue;
		}

		const linkEl = doc.createElement('a');
		linkEl.href = link.href ?? link.title;
		linkEl.innerHTML = link.title;
		linkEl.title = link.description;

		dropdownEl.append(linkEl);
	}

	const updateButtonText = (isOpen: boolean) => {
		moreLinksBtn.innerHTML = `more ${isOpen ? '▴' : '▾'}`;
	};

	pageTop.append(moreLinkSeparator, moreLinksBtn);
	pageTop.closest('table')?.parentElement?.append(dropdownEl);

	updateButtonText(false);

	createDropdown({
		triggerElement: moreLinksBtn,
		dropdownElement: dropdownEl,
		doc,
		ctx,
		onToggle: updateButtonText,
	});
};
