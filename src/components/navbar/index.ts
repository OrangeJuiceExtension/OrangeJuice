import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { isClickModified } from '@/utils/dom.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

const linkDetails = [
	{
		title: 'leaders',
		description: 'Users with most karma',
	},
	{
		title: 'best',
		description: 'Highest-voted recent links',
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
		title: 'bestcomments',
		description: 'Highest-voted recent comments',
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

const pageStyle = `
	.oj_navbar_links_dropdown {
		border: 1px solid #000;
		margin-top: 0px;
		position: absolute;
		background-color: #fff;
		white-space: nowrap;
	}
	
	.oj_navbar_links_dropdown a, .oj_navbar_links_dropdown a:visited {
		display: block;
		text-align: left;
		text-decoration: underline;
		height: 20px;
		padding: 0 5px;
		color: #000;
	}

	.oj_navbar_links_button {
		user-select: none;
	}
	
	.oj_navbar_links_button:hover {
		cursor: pointer;
	}
`;

export const navbar: ComponentFeature = {
	id: 'user',
	loginRequired: true,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	main(ctx: ContentScriptContext) {
		const navbar = document.querySelector('span.pagetop');
		if (!navbar) {
			return false;
		}

		const pageTop = document.querySelectorAll('span.pagetop');
		if (pageTop.length < 2) {
			return;
		}

		const style = document.createElement('style');
		style.innerHTML = pageStyle;
		document.head.appendChild(style);

		const moreLinkSeparator = document.createElement('span');
		moreLinkSeparator.innerHTML = ' | ';

		const moreLinksBtn = document.createElement('a');
		moreLinksBtn.classList.add('oj_navbar_links_button');
		moreLinksBtn.innerHTML = 'more links ▾';

		const dropdownEl = document.createElement('div') as HTMLDivElement;
		dropdownEl.style.display = 'none';
		dropdownEl.classList.add('oj_navbar_links_dropdown');

		for (const link of linkDetails) {
			if (window.location.pathname === `/${link.title}`) {
				continue;
			}

			const linkEl = document.createElement('a');
			linkEl.href = link.title;
			linkEl.innerHTML = link.title;
			linkEl.title = link.description;

			dropdownEl.append(linkEl);
		}

		navbar.append(moreLinkSeparator, moreLinksBtn);
		pageTop[1].closest('table')?.parentElement?.append(dropdownEl);

		let openState = 0;

		const moreLinksBtnHandler = (event: MouseEvent) => {
			event.stopPropagation();
			event.preventDefault();

			if (isClickModified(event)) {
				return;
			}

			dropdownEl.style.left = `${moreLinksBtn.getBoundingClientRect().left}px`;
			const display = dropdownEl.style.display;
			dropdownEl.style.display = display === 'none' ? 'block' : 'none';
			moreLinksBtn.innerHTML = `more links ${openState ? '▾' : '▴'}`;
			openState = 1 - openState;
		};

		moreLinksBtn.addEventListener('click', moreLinksBtnHandler);

		const resizeHandler = (_e: Event) => {
			if (openState > 0) {
				dropdownEl.style.left = `${moreLinksBtn.getBoundingClientRect().left}px`;
			}
		};
		window.addEventListener('resize', resizeHandler);

		const outsideClickHandler = (event: MouseEvent) => {
			if (openState === 0) {
				return;
			}

			const target = event.target as Node;
			if (!(dropdownEl.contains(target) || moreLinksBtn.contains(target))) {
				dropdownEl.style.display = 'none';
				openState = 1 - openState;
			}
		};
		document.addEventListener('click', outsideClickHandler);

		ctx.onInvalidated(() => {
			moreLinksBtn.removeEventListener('click', moreLinksBtnHandler);
			window.removeEventListener('resize', resizeHandler);
			document.removeEventListener('click', outsideClickHandler);
		});
	},
};
