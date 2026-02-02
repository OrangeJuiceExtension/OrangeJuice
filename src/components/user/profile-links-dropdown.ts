import DOMPurify from 'dompurify';
import type { ContentScriptContext } from '#imports';
import { createDropdown, createDropdownStyle } from '@/components/common/dropdown';

const getLinks = (user: string) => {
	return [
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

	const style = doc.createElement('style');
	style.innerHTML = createDropdownStyle(COMPONENT_NAME);
	doc.head.appendChild(style);

	const dropdownEl = doc.createElement('div') as HTMLDivElement;
	dropdownEl.classList.add(COMPONENT_NAME);

	const updateUserLinkText = (isOpen: boolean) => {
		userLink.innerHTML = `${userName} ${isOpen ? '▴' : '▾'}`;
	};

	userLink.classList.add(`${COMPONENT_NAME}_button`);

	for (const link of getLinks(userName)) {
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
