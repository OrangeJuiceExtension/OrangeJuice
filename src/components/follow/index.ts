import { browser, type ContentScriptContext } from '#imports';
import { hideBody, showBody } from '@/components/common/hide-body.ts';
import { wrapBodyWithHnTemplate } from '@/components/common/hn-template.tsx';
import { createModal } from '@/components/common/modal.ts';
import { darkModeToggle } from '@/components/navbar/dark-mode-toggle.ts';
import { moreLinksDropdown } from '@/components/navbar/more-links-dropdown.ts';
import { profileLinksDropdown } from '@/components/user/profile-links-dropdown.ts';
import { showUserInfoOnHover } from '@/components/user/show-user-info-hover.ts';
import { apiModule, type HNItemInfo, type HNUser } from '@/utils/api.ts';
import { dom } from '@/utils/dom.ts';
import { getFollowedUsers, toggleFollowedUser } from '@/utils/followed-users.ts';
import { getCachedFollowingSection, setCachedFollowingSection } from '@/utils/following-cache.ts';
import { createSanitizedFragment } from '@/utils/html.ts';
import { paths } from '@/utils/paths.ts';
import type { ComponentFeature } from '@/utils/types.ts';

const MAX_ACTIVITY_ITEMS_PER_USER = 10;
const FOLLOWING_PATH = '/following';
const FOLLOW_BUTTON_CLASS = 'oj-follow-button';
const FOLLOW_BUTTON_CONTAINER_CLASS = 'oj-follow-button-wrap';
const FOLLOW_ICON_CLASS = 'oj-follow-icon';
const FOLLOW_ICON_PATHS = {
	false: '/icon/follow-plus.svg',
	true: '/icon/follow-check.svg',
} as const;
const FOLLOW_STYLE_ID = 'oj-follow-style';
const FOLLOWING_ROOT_ID = 'oj-following-root';
const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:']);
const TITLE_FALLBACK = '(untitled)';
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
	dateStyle: 'medium',
	timeStyle: 'short',
});
const getHnUrl = (path: string): string => new URL(path, paths.base).toString();

interface FollowedUserSection {
	items: FollowedDisplayItem[];
	user?: HNUser;
	username: string;
}

type FollowedDisplayItem = HNItemInfo & { storyTitle?: string };

interface FollowingRenderOptions {
	currentUsername?: string;
	includeNavEnhancements?: boolean;
	topColor?: string;
}

const FOLLOW_STYLES = `
	.${FOLLOW_BUTTON_CONTAINER_CLASS} {
		display: inline-flex;
		align-items: center;
		margin-left: 3px;
	}

	.${FOLLOW_BUTTON_CLASS} {
		align-items: center;
		border: 1px solid transparent;
		background: transparent;
		color: #a28e73;
		display: inline-flex;
		font: inherit;
		height: 16px;
		justify-content: center;
		line-height: 1;
		padding: 0;
		border-radius: 999px;
		cursor: pointer;
		opacity: 0.82;
		width: 16px;
	}

	.${FOLLOW_BUTTON_CLASS}[data-following="true"] {
		background: rgba(255, 102, 0, 0.08);
		border-color: rgba(255, 102, 0, 0.16);
		color: #c46a20;
	}

	.${FOLLOW_BUTTON_CLASS}:disabled {
		cursor: progress;
		opacity: 0.65;
	}

	.${FOLLOW_BUTTON_CLASS}:hover,
	.${FOLLOW_BUTTON_CLASS}:focus-visible {
		border-color: rgba(255, 102, 0, 0.14);
		background: rgba(255, 102, 0, 0.05);
		color: #8f6a3f;
		opacity: 1;
	}

	.${FOLLOW_ICON_CLASS} {
		background-color: currentColor;
		display: block;
		height: 10px;
		mask-position: center;
		mask-repeat: no-repeat;
		mask-size: contain;
		-webkit-mask-position: center;
		-webkit-mask-repeat: no-repeat;
		-webkit-mask-size: contain;
		width: 10px;
	}

	#${FOLLOWING_ROOT_ID} {
		padding: 8px 0 24px;
	}

	.oj-following__header {
		padding: 0 18px 10px;
	}

	.oj-following__heading-line {
		align-items: baseline;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.oj-following__title {
		font-size: 17px;
		font-weight: bold;
		margin: 0;
	}

	.oj-following__subtitle {
		color: #828282;
		font-size: 9pt;
		margin: 0;
	}

	.oj-following__summary {
		color: #828282;
		font-size: 8pt;
		margin-top: 6px;
	}

	.oj-following__summary a,
	.oj-following__summary a:visited {
		color: #828282;
		text-decoration: none;
	}

	.oj-following__summary a:hover,
	.oj-following__summary a:focus-visible {
		text-decoration: underline;
	}

	.oj-following__empty,
	.oj-following__error {
		padding: 8px 18px 16px;
	}

	.oj-following__sections {
		padding: 6px 0 0;
	}

	.oj-following__section {
		padding: 0 0 12px;
	}

	.oj-following__section-header {
		align-items: center;
		display: flex;
		gap: 8px;
		padding: 0 18px 4px;
	}

	.oj-following__user-meta {
		color: #828282;
		font-size: 8pt;
		margin-top: 2px;
	}

	.oj-following__user-name {
		align-items: center;
		display: inline-flex;
		gap: 4px;
	}

	.oj-following__user-name > a {
		color: #828282;
		text-decoration: none;
	}

	.oj-following__user-name > a:visited {
		color: #828282;
	}

	.oj-following__user-name > a:hover,
	.oj-following__user-name > a:focus-visible {
		text-decoration: underline;
	}

	.oj-following__table {
		border-collapse: collapse;
		margin-left: 18px;
		margin-top: 6px;
		width: 100%;
	}

	.oj-following__title-cell {
		padding: 0 0 0 18px;
		vertical-align: top;
	}

	.oj-following__title-cell a,
	.oj-following__title-cell a:visited {
		color: #000000;
		text-decoration: none;
	}

	.oj-following__title-cell a:hover,
	.oj-following__title-cell a:focus-visible {
		text-decoration: underline;
	}

	.oj-following__meta {
		color: #828282;
		font-size: 8pt;
		padding-left: 18px;
	}

	.oj-following__meta a,
	.oj-following__meta a:visited {
		color: #828282;
	}

	.oj-following__confirm-actions {
		display: flex;
		gap: 8px;
		justify-content: flex-end;
		margin-top: 12px;
	}

	.oj-following__confirm-content {
		color: #242424;
	}

	.oj-following__confirm-actions button {
		background: #f6f6ef;
		border: 1px solid #828282;
		color: #242424;
		cursor: pointer;
		font: inherit;
		padding: 2px 8px;
	}

	.oj-following__comment {
		font-size: 9pt;
		line-height: 1.4;
		padding: 10px 0 6px 18px;
	}

	.oj-following__comment a,
	.oj-following__comment a:visited {
		color: inherit;
	}

	.oj-following__comment p:first-child {
		margin-top: 0;
	}

	.oj-following__comment p:last-child {
		margin-bottom: 0;
	}

	html.oj-dark-mode .${FOLLOW_BUTTON_CLASS} {
		background: transparent;
		border-color: transparent;
		color: #857965;
	}

	html.oj-dark-mode .${FOLLOW_BUTTON_CLASS}[data-following="true"] {
		background: rgba(255, 149, 44, 0.1);
		border-color: rgba(255, 149, 44, 0.16);
		color: #d8a56f;
	}

	html.oj-dark-mode .${FOLLOW_BUTTON_CLASS}:hover,
	html.oj-dark-mode .${FOLLOW_BUTTON_CLASS}:focus-visible {
		background: rgba(255, 149, 44, 0.06);
		border-color: rgba(255, 149, 44, 0.12);
		color: #c2a37d;
	}

	html.oj-dark-mode .oj-following__subtitle,
	html.oj-dark-mode .oj-following__user-meta,
	html.oj-dark-mode .oj-following__meta {
		color: var(--oj-fg-secondary);
	}

	html.oj-dark-mode .oj-following__comment {
		color: var(--oj-muted);
	}
`;

const isFollowingPage = (): boolean => window.location.pathname === FOLLOWING_PATH;

const ensureStyles = (doc: Document): void => {
	if (doc.getElementById(FOLLOW_STYLE_ID)) {
		return;
	}

	const style = doc.createElement('style');
	style.id = FOLLOW_STYLE_ID;
	style.textContent = FOLLOW_STYLES;
	doc.head.append(style);
};

const extractUsernameFromAnchor = (anchor: HTMLAnchorElement): string | undefined => {
	try {
		const url = new URL(anchor.getAttribute('href') ?? '', paths.base);
		if (url.pathname !== '/user') {
			return undefined;
		}

		const username = url.searchParams.get('id')?.trim();
		return username || undefined;
	} catch {
		return undefined;
	}
};

const setButtonState = (
	button: HTMLButtonElement,
	username: string,
	isFollowing: boolean
): void => {
	button.dataset.followUsername = username;
	button.dataset.following = `${isFollowing}`;
	button.setAttribute('aria-label', `${isFollowing ? 'Unfollow' : 'Follow'} ${username}`);
	button.title = `${isFollowing ? 'Unfollow' : 'Follow'} ${username}`;
	button.replaceChildren(createFollowIcon(button.ownerDocument, isFollowing));
};

const getFollowIconUrl = (isFollowing: boolean): string =>
	browser.runtime?.getURL?.(FOLLOW_ICON_PATHS[`${isFollowing}`]) ??
	FOLLOW_ICON_PATHS[`${isFollowing}`];

const createFollowIcon = (doc: Document, isFollowing: boolean): HTMLSpanElement => {
	const icon = doc.createElement('span');
	const iconUrl = getFollowIconUrl(isFollowing);
	icon.className = FOLLOW_ICON_CLASS;
	icon.setAttribute('aria-hidden', 'true');
	icon.style.maskImage = `url("${iconUrl}")`;
	icon.style.webkitMaskImage = `url("${iconUrl}")`;
	return icon;
};

const createFollowButton = (
	doc: Document,
	username: string,
	isFollowing: boolean
): HTMLButtonElement => {
	const button = doc.createElement('button');
	button.className = FOLLOW_BUTTON_CLASS;
	button.type = 'button';
	setButtonState(button, username, isFollowing);
	return button;
};

const collectChrome = (doc: Document): { footer?: Node; nav?: Node } => {
	const nav =
		doc.querySelector<HTMLTableCellElement>('#hnmain > tbody > tr:nth-child(2) > td') ??
		doc.querySelector<HTMLTableCellElement>('#hnmain > tr:nth-child(2) > td');
	const footerSource =
		doc.querySelector<HTMLTableCellElement>('#hnmain > tbody > tr:last-child > td') ??
		doc.querySelector<HTMLTableCellElement>('#hnmain > tr:last-child > td');

	let footer: HTMLDivElement | undefined;
	if (footerSource) {
		footer = doc.createElement('div');
		for (const child of Array.from(footerSource.childNodes)) {
			footer.append(child.cloneNode(true));
		}
	}

	return { footer, nav: nav ?? undefined };
};

const formatTimestamp = (unixTime: number): string =>
	DATE_FORMATTER.format(new Date(unixTime * 1000));

const setAnchorHref = (anchor: HTMLAnchorElement, href: string): void => {
	anchor.href = href;

	try {
		const resolved = new URL(href, paths.base);
		const isExternal =
			resolved.origin !== new URL(paths.base).origin &&
			EXTERNAL_PROTOCOLS.has(resolved.protocol);
		if (isExternal) {
			anchor.target = '_blank';
			anchor.rel = 'noopener noreferrer';
		}
	} catch {
		anchor.removeAttribute('target');
		anchor.removeAttribute('rel');
	}
};

const appendSanitizedHtml = (element: Element, html: string): void => {
	element.replaceChildren(createSanitizedFragment(element.ownerDocument, html));
};

const createMetaContent = (doc: Document, item: HNItemInfo): DocumentFragment => {
	const fragment = doc.createDocumentFragment();
	fragment.append(formatTimestamp(item.time));

	if (typeof item.score === 'number') {
		fragment.append(` · ${item.score} points`);
	}

	const discussionLink = doc.createElement('a');
	discussionLink.href = getHnUrl(`/item?id=${item.id}`);
	discussionLink.textContent =
		typeof item.descendants === 'number'
			? `${item.descendants} ${item.descendants === 1 ? 'comment' : 'comments'}`
			: 'discuss';
	fragment.append(' · ', discussionLink);

	return fragment;
};

const createSectionId = (username: string): string => encodeURIComponent(username);

const createCommentTitleRow = (
	doc: Document,
	item: FollowedDisplayItem
): HTMLTableRowElement | undefined => {
	if (!(item.type === 'comment' && item.storyTitle)) {
		return undefined;
	}

	const titleRow = doc.createElement('tr');
	const titleCell = doc.createElement('td');
	titleCell.className = 'title oj-following__title-cell';

	const storyLink = doc.createElement('a');
	storyLink.href = getHnUrl(`/item?id=${item.parent ?? item.id}`);
	storyLink.textContent = item.storyTitle;

	titleCell.append(storyLink);
	titleRow.append(titleCell);
	return titleRow;
};

const createItemRows = (doc: Document, item: FollowedDisplayItem): HTMLTableRowElement[] => {
	if (item.type === 'comment') {
		const rows: HTMLTableRowElement[] = [];
		const commentTitleRow = createCommentTitleRow(doc, item);
		if (commentTitleRow) {
			rows.push(commentTitleRow);
		}

		const metaRow = doc.createElement('tr');
		const metaCell = doc.createElement('td');
		metaCell.className = 'subtext oj-following__meta';
		metaCell.append(createMetaContent(doc, item));
		metaRow.append(metaCell);

		const commentRow = doc.createElement('tr');
		const commentCell = doc.createElement('td');
		commentCell.className = 'oj-following__comment';
		if (item.text) {
			appendSanitizedHtml(commentCell, item.text);
		}
		commentRow.append(commentCell);

		const spacerRow = doc.createElement('tr');
		spacerRow.className = 'spacer';
		spacerRow.style.height = '8px';
		const spacerCell = doc.createElement('td');
		spacerRow.append(spacerCell);

		rows.push(metaRow, commentRow, spacerRow);
		return rows;
	}

	const titleRow = doc.createElement('tr');
	const titleCell = doc.createElement('td');
	titleCell.className = 'title oj-following__title-cell';

	const titleLink = doc.createElement('a');
	setAnchorHref(titleLink, item.url ?? getHnUrl(`/item?id=${item.id}`));
	appendSanitizedHtml(titleLink, item.title ?? TITLE_FALLBACK);
	titleCell.append(titleLink);
	titleRow.append(titleCell);

	const metaRow = doc.createElement('tr');
	const metaCell = doc.createElement('td');
	metaCell.className = 'subtext oj-following__meta';
	metaCell.append(createMetaContent(doc, item));
	metaRow.append(metaCell);

	const rows = [titleRow, metaRow];

	const spacerRow = doc.createElement('tr');
	spacerRow.className = 'spacer';
	spacerRow.style.height = '8px';
	const spacerCell = doc.createElement('td');
	spacerRow.append(spacerCell);
	rows.push(spacerRow);

	return rows;
};

const sortItemsByRecentActivity = (items: readonly FollowedDisplayItem[]): FollowedDisplayItem[] =>
	[...items].sort((left, right) => right.time - left.time);

const loadSection = async (
	username: string,
	options: FollowingRenderOptions = {}
): Promise<FollowedUserSection> => {
	const { currentUsername } = options;
	const cachedSection = await getCachedFollowingSection(username);
	if (cachedSection) {
		return {
			...cachedSection,
			items: sortItemsByRecentActivity(cachedSection.items),
		};
	}

	const user = await apiModule.getUserInfo(username, currentUsername);
	if (!user) {
		return { items: [], username };
	}

	const recentItemIds = user.submitted.slice(0, MAX_ACTIVITY_ITEMS_PER_USER);
	const items = await Promise.all(recentItemIds.map((id) => apiModule.getItemInfo(`${id}`)));
	const visibleItems = items.filter((item): item is HNItemInfo =>
		Boolean(
			item &&
				!item.deleted &&
				!item.dead &&
				(item.type === 'comment' ||
					item.type === 'story' ||
					item.type === 'job' ||
					item.type === 'poll')
		)
	);

	const itemInfoById = new Map<number, HNItemInfo>();
	for (const item of visibleItems) {
		itemInfoById.set(item.id, item);
	}

	const resolveStoryTitle = async (item: HNItemInfo): Promise<string | undefined> => {
		let currentParentId = item.parent;
		while (typeof currentParentId === 'number') {
			let parentItem = itemInfoById.get(currentParentId);
			if (!parentItem) {
				parentItem = (await apiModule.getItemInfo(`${currentParentId}`)) ?? undefined;
				if (!parentItem) {
					return undefined;
				}
				itemInfoById.set(currentParentId, parentItem);
			}

			if (parentItem.title) {
				return parentItem.title;
			}

			currentParentId = parentItem.parent;
		}
		return undefined;
	};

	const itemsWithStoryTitles: FollowedDisplayItem[] = await Promise.all(
		visibleItems.map(async (item) =>
			item.type === 'comment'
				? {
						...item,
						storyTitle: await resolveStoryTitle(item),
					}
				: item
		)
	);
	const cachedSectionData = {
		items: sortItemsByRecentActivity(itemsWithStoryTitles),
		user,
		username,
	};
	await setCachedFollowingSection(cachedSectionData);

	return {
		...cachedSectionData,
		items: cachedSectionData.items,
	};
};

const renderEmptyState = (doc: Document, root: HTMLElement): void => {
	const empty = doc.createElement('div');
	empty.className = 'oj-following__empty';
	empty.textContent =
		'No followed users yet. Use the small follow buttons next to usernames to build this page.';
	root.append(empty);
};

const confirmUnfollow = async (
	ctx: ContentScriptContext,
	doc: Document,
	username: string
): Promise<boolean> =>
	new Promise((resolve) => {
		const content = doc.createElement('div');
		content.className = 'oj-following__confirm-content';
		const message = doc.createElement('p');
		message.textContent = `Unfollow ${username}?`;

		const actions = doc.createElement('div');
		actions.className = 'oj-following__confirm-actions';

		const cancelButton = doc.createElement('button');
		cancelButton.type = 'button';
		cancelButton.textContent = 'Cancel';

		const confirmButton = doc.createElement('button');
		confirmButton.type = 'button';
		confirmButton.textContent = 'Unfollow';

		content.append(message, actions);
		actions.append(cancelButton, confirmButton);

		let settled = false;
		const settle = (value: boolean) => {
			if (settled) {
				return;
			}
			settled = true;
			resolve(value);
		};

		const overlay = createModal({
			content,
			ctx,
			doc,
			onClose: () => settle(false),
		});

		cancelButton.addEventListener('click', () => {
			overlay.remove();
			settle(false);
		});

		confirmButton.addEventListener('click', () => {
			overlay.remove();
			settle(true);
		});

		doc.body.append(overlay);
		confirmButton.focus();
	});

const renderFollowingSections = async (
	ctx: ContentScriptContext,
	doc: Document,
	root: HTMLElement,
	options: FollowingRenderOptions = {}
): Promise<void> => {
	const followedUsers = await getFollowedUsers();
	if (followedUsers.length === 0) {
		renderEmptyState(doc, root);
		return;
	}

	const sections = await Promise.all(
		followedUsers.map((username) => loadSection(username, options))
	);
	const list = doc.createElement('div');
	list.className = 'oj-following__sections';

	for (const section of sections) {
		const article = doc.createElement('section');
		article.className = 'oj-following__section';
		article.id = createSectionId(section.username);

		const header = doc.createElement('div');
		header.className = 'oj-following__section-header';

		const headerText = doc.createElement('div');
		const heading = doc.createElement('div');
		heading.className = 'oj-following__user-name';
		heading.style.fontWeight = 'bold';

		const profileLink = doc.createElement('a');
		profileLink.href = getHnUrl(`/user?id=${encodeURIComponent(section.username)}`);
		profileLink.className = 'hnuser';
		profileLink.textContent = section.username;
		heading.append(profileLink);

		const meta = doc.createElement('div');
		meta.className = 'oj-following__user-meta';
		meta.textContent = section.user
			? `${section.user.karma} karma · ${section.user.submitted.length} submitted · ${section.items.length} recents`
			: 'Unable to load user details';
		headerText.append(heading, meta);

		const unfollowButton = createFollowButton(doc, section.username, true);
		unfollowButton.addEventListener('click', async () => {
			const shouldUnfollow = await confirmUnfollow(ctx, doc, section.username);
			if (!shouldUnfollow) {
				return;
			}

			unfollowButton.disabled = true;
			try {
				await toggleFollowedUser(section.username);
				await renderFollowingPage(ctx, doc, options);
			} finally {
				unfollowButton.disabled = false;
			}
		});

		heading.append(unfollowButton);
		header.append(headerText);
		article.append(header);

		if (section.items.length === 0) {
			const empty = doc.createElement('div');
			empty.className = 'oj-following__meta';
			empty.style.paddingLeft = '18px';
			empty.textContent = 'No recent comments or submissions available.';
			article.append(empty);
			list.append(article);
			continue;
		}

		const items = doc.createElement('table');
		items.className = 'oj-following__table';
		const tbody = doc.createElement('tbody');
		for (const item of section.items) {
			for (const row of createItemRows(doc, item)) {
				tbody.append(row);
			}
		}
		items.append(tbody);

		article.append(items);
		list.append(article);
	}

	root.append(list);
};

export const renderFollowingPage = async (
	ctx: ContentScriptContext,
	doc: Document,
	options: FollowingRenderOptions = {}
): Promise<void> => {
	const { includeNavEnhancements = true, topColor } = options;
	ensureStyles(doc);
	hideBody(doc);

	const chrome = collectChrome(doc);
	const root = doc.createElement('div');
	root.id = FOLLOWING_ROOT_ID;

	const header = doc.createElement('header');
	header.className = 'oj-following__header';

	const headingLine = doc.createElement('div');
	headingLine.className = 'oj-following__heading-line';

	const title = doc.createElement('h1');
	title.className = 'oj-following__title';
	title.textContent = 'Following';

	const subtitle = doc.createElement('p');
	subtitle.className = 'oj-following__subtitle';
	subtitle.textContent = 'Recent comments and submissions from accounts you follow.';

	headingLine.append(title, subtitle);
	header.append(headingLine);

	const followedUsers = await getFollowedUsers();
	if (followedUsers.length > 0) {
		const summary = doc.createElement('div');
		summary.className = 'oj-following__summary';

		for (const [index, username] of followedUsers.entries()) {
			const link = doc.createElement('a');
			link.href = `#${createSectionId(username)}`;
			link.textContent = username;
			summary.append(link);
			if (index < followedUsers.length - 1) {
				summary.append(', ');
			}
		}

		header.append(summary);
	}

	root.append(header);

	try {
		await renderFollowingSections(ctx, doc, root, options);
	} catch (error) {
		console.error({ error: 'Failed to render following page', cause: error });
		const errorElement = doc.createElement('div');
		errorElement.className = 'oj-following__error';
		errorElement.textContent = 'Could not load followed activity right now.';
		root.append(errorElement);
	}

	doc.body.replaceChildren(root);
	await wrapBodyWithHnTemplate(doc, { ...chrome, topColor });
	const navbar = doc.querySelector<HTMLElement>('.oj-hn-nav-table');
	await darkModeToggle(ctx, doc, navbar);
	if (includeNavEnhancements) {
		moreLinksDropdown(ctx, doc, navbar);
		profileLinksDropdown(ctx, doc);
	}
	dom.ensureTopBarReadableText(doc);
	showBody(doc);
};

const registerButton = (
	ctx: ContentScriptContext,
	doc: Document,
	username: string,
	buttonsByUsername: Map<string, Set<HTMLButtonElement>>,
	button: HTMLButtonElement,
	currentUsername?: string
): void => {
	const existing = buttonsByUsername.get(username) ?? new Set<HTMLButtonElement>();
	existing.add(button);
	buttonsByUsername.set(username, existing);

	button.addEventListener('click', async (event) => {
		event.preventDefault();
		event.stopPropagation();

		for (const candidate of buttonsByUsername.get(username) ?? []) {
			candidate.disabled = true;
		}

		try {
			const nextState = await toggleFollowedUser(username);
			for (const candidate of buttonsByUsername.get(username) ?? []) {
				setButtonState(candidate, username, nextState);
			}

			if (isFollowingPage()) {
				await renderFollowingPage(ctx, doc, { currentUsername });
			}
		} finally {
			for (const candidate of buttonsByUsername.get(username) ?? []) {
				candidate.disabled = false;
			}
		}
	});
};

const attachButtonAfterNode = (
	ctx: ContentScriptContext,
	doc: Document,
	target: Node,
	username: string,
	buttonsByUsername: Map<string, Set<HTMLButtonElement>>,
	isFollowing: boolean,
	currentUsername?: string
): void => {
	if (!(target.parentNode instanceof Element)) {
		return;
	}

	const wrap = doc.createElement('span');
	wrap.className = FOLLOW_BUTTON_CONTAINER_CLASS;
	const button = createFollowButton(doc, username, isFollowing);
	wrap.append(button);
	target.parentNode.insertBefore(wrap, target.nextSibling);
	registerButton(ctx, doc, username, buttonsByUsername, button, currentUsername);
};

const appendButtonToElement = (
	ctx: ContentScriptContext,
	doc: Document,
	element: Element,
	username: string,
	buttonsByUsername: Map<string, Set<HTMLButtonElement>>,
	isFollowing: boolean,
	currentUsername?: string
): void => {
	const wrap = doc.createElement('span');
	wrap.className = FOLLOW_BUTTON_CONTAINER_CLASS;
	const button = createFollowButton(doc, username, isFollowing);
	wrap.append(button);
	element.append(' ', wrap);
	registerButton(ctx, doc, username, buttonsByUsername, button, currentUsername);
};

const enhanceUserLinks = async (
	ctx: ContentScriptContext,
	doc: Document,
	currentUsername?: string
): Promise<void> => {
	ensureStyles(doc);
	const buttonsByUsername = new Map<string, Set<HTMLButtonElement>>();
	const followedUsers = new Set(await getFollowedUsers());

	const anchors = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a.hnuser'));
	for (const anchor of anchors) {
		if (anchor.dataset.ojFollowInitialized === 'true') {
			continue;
		}

		const username = extractUsernameFromAnchor(anchor);
		if (!(username && username !== currentUsername)) {
			continue;
		}

		anchor.dataset.ojFollowInitialized = 'true';
		attachButtonAfterNode(
			ctx,
			doc,
			anchor,
			username,
			buttonsByUsername,
			followedUsers.has(username),
			currentUsername
		);
	}

	if (!window.location.pathname.startsWith('/user')) {
		return;
	}

	const profileUsername = new URL(window.location.href).searchParams.get('id')?.trim();
	if (!(profileUsername && profileUsername !== currentUsername)) {
		return;
	}

	const profileValueCell = Array.from(doc.querySelectorAll<HTMLTableRowElement>('tr'))
		.find(
			(row) => row.querySelector<HTMLTableCellElement>('td')?.textContent?.trim() === 'user:'
		)
		?.querySelectorAll<HTMLTableCellElement>('td')[1];
	if (!(profileValueCell instanceof HTMLTableCellElement)) {
		return;
	}

	if (profileValueCell.querySelector(`.${FOLLOW_BUTTON_CONTAINER_CLASS}`)) {
		return;
	}

	appendButtonToElement(
		ctx,
		doc,
		profileValueCell,
		profileUsername,
		buttonsByUsername,
		followedUsers.has(profileUsername),
		currentUsername
	);
};

export const follow: ComponentFeature = {
	id: 'follow',
	loginRequired: false,
	matches: [`${paths.base}/*`],
	runAt: 'document_end',
	async main(ctx: ContentScriptContext) {
		if (isFollowingPage()) {
			await renderFollowingPage(ctx, document, { currentUsername: follow.username });
			showUserInfoOnHover(ctx, document, follow.username);
			return;
		}

		await enhanceUserLinks(ctx, document, follow.username);
	},
};
