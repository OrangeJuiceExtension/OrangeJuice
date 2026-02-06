import linkifyHtml from 'linkify-html';
import type { ContentScriptContext } from '#imports';
import { apiModule } from '@/utils/api.ts';

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
export const USER_INFO_HOVER_CLASS = 'oj_user_info_hover';

export const showUserInfoOnHover = (
	ctx: ContentScriptContext,
	doc: Document,
	username?: string
) => {
	const style = doc.createElement('style');
	style.textContent = `
		.${USER_INFO_HOVER_CLASS} {
			position: absolute;
			background: #f6f6ef;
			z-index: 2;
			border: 1px solid #000;
			padding: 3px;
			max-width: 500px;
			max-height: 400px;
			overflow-y: auto;
			display: none;
		}
		
		.${USER_INFO_HOVER_CLASS}.active {
			display: block;
			margin-top: 2px;
		}

		.${USER_INFO_HOVER_CLASS} td {
			font-size: 10px !important;
			vertical-align: top;
		}
		
		.${USER_INFO_HOVER_CLASS} td:nth-child(2) {
			word-break: break-word;
		}
		
		.${USER_INFO_HOVER_CLASS} td a {
			color: #000 !important;
			text-decoration: none !important;
		}
	`;
	doc.head.appendChild(style);

	const allUsers = doc.querySelectorAll('a.hnuser') as NodeListOf<HTMLAnchorElement>;
	if (!allUsers.length) {
		return;
	}

	// Globals
	const cachedData = new Map<string, HTMLDivElement>();
	let activeTrigger: HTMLAnchorElement | null = null;
	let popover: HTMLDivElement | null = null;

	const populateUserDiv = async (user: HTMLAnchorElement, userDivBox: HTMLDivElement) => {
		const userName = user.innerText.trim().split(' ')[0];
		if (cachedData.has(userName)) {
			userDivBox.innerHTML = cachedData.get(userName)?.innerHTML || '';
			return;
		}

		const userInfo = await apiModule.getUserInfo(userName, username);
		if (!userInfo) {
			return;
		}

		const userDate = new Date(userInfo.created * 1000);
		const renderedDate = Intl.DateTimeFormat().format(userDate);
		const isNewUser = Date.now() - userDate.getTime() < ONE_MONTH_MS;

		const table = `
				<table>
					<tbody>
						<tr>
							<td>user:</td>
							<td><font${isNewUser ? ' color="#3c963c"' : ''}>${userInfo.id}</font></td>
						</tr>
						<tr>
							<td>created:</td>
							<td>${renderedDate}</td>
						</tr>
						<tr>
							<td>karma:</td>
							<td>${userInfo.karma}</td>
						</tr>
						<tr>
							<td>submitted:</td>
							<td>${userInfo.submitted.length}</td>
						</tr>
						${
							userInfo.about
								? `<tr><td>about:</td><td>${userInfo.about}</td></tr>`
								: ''
						}
					</tbody>
				</table>
			`;

		userDivBox.innerHTML = linkifyHtml(table, { attributes: { rel: 'noopener' } });
		cachedData.set(userName, userDivBox);
	};

	const createUserDiv = (doc: Document) => {
		const userDiv = doc.createElement('div') as HTMLDivElement;
		userDiv.classList.add(USER_INFO_HOVER_CLASS);
		return userDiv;
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
		trigger.parentElement?.append(popover);
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

	ctx.onInvalidated(() => {
		for (const user of allUsers) {
			user.removeEventListener('mouseover', onMouseOver);
		}
		doc.removeEventListener('mousemove', onMouseMove);
	});

	for (const user of allUsers) {
		user.addEventListener('mouseover', onMouseOver);
	}
};
