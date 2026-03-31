import type { ContentScriptContext } from '#imports';
import { apiModule } from '@/utils/api.ts';
import { cloneChildNodesInto, createSanitizedFragment, linkifyTextNodes } from '@/utils/html.ts';

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
export const USER_INFO_HOVER_CLASS = 'oj_user_info_hover';
const USER_INFO_HOVER_STYLE_ID = 'oj-user-info-hover-style';
const hoverCleanupByDocument = new WeakMap<Document, () => void>();

export const showUserInfoOnHover = (
	ctx: ContentScriptContext,
	doc: Document,
	username?: string
) => {
	hoverCleanupByDocument.get(doc)?.();

	let style = doc.getElementById(USER_INFO_HOVER_STYLE_ID) as HTMLStyleElement | null;
	if (!style) {
		style = doc.createElement('style');
		style.id = USER_INFO_HOVER_STYLE_ID;
		style.textContent = `
		.${USER_INFO_HOVER_CLASS} {
			position: absolute;
			background: #f6f6ef;
			color: #828282;
			z-index: 2;
			border: 1px solid #000;
			padding: 3px;
			max-width: 500px;
			max-height: 400px;
			overflow-y: auto;
			display: none;
			font-family: Verdana, Geneva, sans-serif;
			font-size: 10pt;
			font-weight: normal;
			line-height: 1.4;
		}
		
		.${USER_INFO_HOVER_CLASS}.active {
			display: block;
			margin-top: 2px;
		}

		html.oj-dark-mode .${USER_INFO_HOVER_CLASS},
		html.oj-dark-mode .${USER_INFO_HOVER_CLASS} {
			background: #302d21;
			border-color: #e8e6e3;
			color: var(--oj-muted) !important;
		}

		html.oj-dark-mode .${USER_INFO_HOVER_CLASS} td {
			color: var(--oj-muted) !important;
		}

		html.oj-dark-mode .${USER_INFO_HOVER_CLASS}.active {
			background: rgb(44, 42, 31);
		}

		.${USER_INFO_HOVER_CLASS} td {
			vertical-align: top;
		}
	`;
		doc.head.appendChild(style);
	}

	const allUsers = doc.querySelectorAll('a.hnuser') as NodeListOf<HTMLAnchorElement>;
	if (!allUsers.length) {
		hoverCleanupByDocument.delete(doc);
		return;
	}

	// Globals
	const cachedData = new Map<string, HTMLDivElement>();
	let activeTrigger: HTMLAnchorElement | null = null;
	let popover: HTMLDivElement | null = null;

	const populateUserDiv = async (user: HTMLAnchorElement, userDivBox: HTMLDivElement) => {
		const userName = user.innerText.trim().split(' ')[0];
		const cachedUserDiv = cachedData.get(userName);
		if (cachedUserDiv) {
			cloneChildNodesInto(cachedUserDiv, userDivBox);
			return;
		}

		const userInfo = await apiModule.getUserInfo(userName, username);
		if (!userInfo) {
			return;
		}

		const userDate = new Date(userInfo.created * 1000);
		const renderedDate = Intl.DateTimeFormat().format(userDate);
		const isNewUser = Date.now() - userDate.getTime() < ONE_MONTH_MS;

		const table = doc.createElement('table');
		const tbody = doc.createElement('tbody');
		table.append(tbody);

		const appendRow = (label: string, value: string | Node, options?: { green?: boolean }) => {
			const row = doc.createElement('tr');
			const labelCell = doc.createElement('td');
			labelCell.textContent = label;
			const valueCell = doc.createElement('td');

			if (typeof value === 'string') {
				if (options?.green) {
					const font = doc.createElement('font');
					font.setAttribute('color', '#3c963c');
					font.textContent = value;
					valueCell.append(font);
				} else {
					valueCell.textContent = value;
				}
			} else {
				valueCell.append(value);
			}

			row.append(labelCell, valueCell);
			tbody.append(row);
			return valueCell;
		};

		appendRow('user:', userInfo.id, { green: isNewUser });
		appendRow('created:', renderedDate);
		appendRow('karma:', `${userInfo.karma}`);
		appendRow('submitted:', `${userInfo.submitted.length}`);

		if (userInfo.about) {
			const aboutCell = appendRow('about:', '');
			const aboutContent = createSanitizedFragment(doc, userInfo.about);
			linkifyTextNodes(aboutContent, { openInNewTab: true });
			aboutCell.replaceChildren(aboutContent);
		}

		userDivBox.replaceChildren(table);
		cachedData.set(userName, userDivBox.cloneNode(true) as HTMLDivElement);
	};

	const createUserDiv = (doc: Document) => {
		const userDiv = doc.createElement('div') as HTMLDivElement;
		userDiv.classList.add(USER_INFO_HOVER_CLASS);
		return userDiv;
	};

	const positionPopover = (trigger: HTMLAnchorElement, userDiv: HTMLDivElement): void => {
		const triggerRect = trigger.getBoundingClientRect();
		const left = window.scrollX + triggerRect.left;
		const top = window.scrollY + triggerRect.bottom + 2;

		userDiv.style.left = `${left}px`;
		userDiv.style.top = `${top}px`;
	};

	function showPopover(trigger: HTMLAnchorElement): Promise<void> {
		if (!popover) {
			popover = createUserDiv(doc);
		}

		popover?.classList.add('active');

		const loader = doc.createElement('div');
		loader.style.margin = '20px';
		loader.classList.add('loader1');

		popover.append(loader);
		positionPopover(trigger, popover);
		doc.body.append(popover);
		activeTrigger = trigger;

		return populateUserDiv(trigger, popover);
	}

	function hidePopover(): void {
		popover?.remove();
		popover = null;
		activeTrigger = null;
	}

	const onMouseOver = (e: MouseEvent): Promise<void> => {
		const trigger = (e.target as HTMLAnchorElement) || null;

		if (!trigger || activeTrigger === trigger) {
			return Promise.resolve();
		}

		if (popover) {
			hidePopover();
		}

		return showPopover(trigger);
	};

	const onMouseMove = (e: MouseEvent): void => {
		if (!(activeTrigger && popover)) {
			return;
		}

		const target = e.target as Node | null;
		if (activeTrigger.contains(target) || popover.contains(target)) {
			return;
		}

		const triggerRect = activeTrigger.getBoundingClientRect();
		const popoverRect = popover.getBoundingClientRect();

		if (popoverRect) {
			const PADDING = 10;

			// Horizontal corridor spanning trigger + popover
			const corridorLeft = Math.min(triggerRect.left, popoverRect.left) - PADDING;
			const corridorRight = Math.max(triggerRect.right, popoverRect.right) + PADDING;

			// Vertical corridor between trigger and popover
			const corridorTop = triggerRect.top;
			const corridorBottom = popoverRect.top + PADDING;

			const isMouseInSafeCorridor =
				e.clientX >= corridorLeft &&
				e.clientX <= corridorRight &&
				e.clientY >= corridorTop &&
				e.clientY <= corridorBottom;

			if (isMouseInSafeCorridor) {
				return;
			}
		}

		hidePopover();
	};

	doc.addEventListener('mousemove', onMouseMove);

	const cleanup = () => {
		for (const user of allUsers) {
			user.removeEventListener('mouseover', onMouseOver);
		}
		doc.removeEventListener('mousemove', onMouseMove);
	};

	hoverCleanupByDocument.set(doc, cleanup);

	ctx.onInvalidated(() => {
		cleanup();
		if (hoverCleanupByDocument.get(doc) === cleanup) {
			hoverCleanupByDocument.delete(doc);
		}
	});

	for (const user of allUsers) {
		user.addEventListener('mouseover', onMouseOver);
	}
};
