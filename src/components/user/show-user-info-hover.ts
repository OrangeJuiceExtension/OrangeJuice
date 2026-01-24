import linkifyHtml from 'linkify-html';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { getUserInfo } from '@/utils/api.ts';
import { months } from '@/utils/date.ts';

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export const showUserInfoOnHover = (
	doc: Document,
	ctx: ContentScriptContext,
	allUsers: NodeListOf<HTMLAnchorElement>
) => {
	const style = doc.createElement('style');
	style.textContent = `
		/* Hover info popup box: */
		.oj_user_info_hover {
			position: absolute;
			background: #f6f6ef;
			z-index: 2;
			border: 1px solid #000;
			padding: 3px;
			max-width: 500px;
			max-height: 400px;
			overflow-y: auto;
		}
		
		.oj_user_info_hover td {
			font-size: 10px !important;
			vertical-align: top;
		}
		
		.oj_user_info_hover td:nth-child(2) {
			word-break: break-word;
		}
		
		.oj_user_info_hover td a {
			color: #000 !important;
			text-decoration: none !important;
		}
		
		a.hnuser:hover ~ .oj_user_info_hover, 
		.oj_user_info_hover:hover {
			display: block;
		}
	`;
	doc.head.appendChild(style);

	for (const user of allUsers) {
		let hideTimeout: ReturnType<typeof setTimeout> | null = null;

		const hideUserInfo = () => {
			hideTimeout = setTimeout(() => {
				const obj =
					user.parentElement?.querySelector<HTMLDivElement>('.oj_user_info_hover');
				if (obj) {
					obj.style.display = 'none';
				}
			}, 100);
		};

		const createUserDiv = () => {
			const userDiv = doc.createElement('div') as HTMLDivElement;
			userDiv.classList.add('oj_user_info_hover');
			userDiv.style.display = 'none';

			user.parentElement?.append(userDiv);
			user.dataset.infoShown = '0';

			userDiv.addEventListener('mouseenter', () => {
				if (hideTimeout) {
					clearTimeout(hideTimeout);
					hideTimeout = null;
				}
			});

			userDiv.addEventListener('mouseleave', hideUserInfo);

			return userDiv;
		};

		const populateUserDiv = async (userDiv: HTMLDivElement) => {
			// prevent FOUS when user hovers over the div
			userDiv.style.display = 'none';
			const userInfo = await getUserInfo(user.innerText?.split(' ')[0]);
			if (!userInfo) {
				return;
			}
			userDiv.style.display = 'block';

			const userDate = new Date(userInfo.created * 1000);
			const renderedDate = `${months[userDate.getMonth()]} ${userDate.getDate()}, ${userDate.getFullYear()}`;

			const isNewUser = Date.now() - userDate.getTime() < ONE_MONTH_MS;
			const tableColor = isNewUser ? ' color="#3c963c"' : '';

			const table = `
				<table>
					<tbody>
						<tr>
							<td>user:</td>
							<td><font${tableColor}>${userInfo.id}</font></td>
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

			userDiv.innerHTML = linkifyHtml(table, { attributes: { rel: 'noopener' } });
			userDiv.style.display = 'block';
		};

		const userHandler = async () => {
			if (hideTimeout) {
				clearTimeout(hideTimeout);
				hideTimeout = null;
			}

			let userDiv = user.parentElement?.querySelector(
				'.oj_user_info_hover'
			) as HTMLDivElement;

			if (!userDiv) {
				userDiv = createUserDiv();
			}

			userDiv.style.display = 'block';
			userDiv.style.left = `${user.getBoundingClientRect().left}px`;

			if (user.dataset.infoShown === '0') {
				user.dataset.infoShown = '1';
				await populateUserDiv(userDiv);
			}
		};

		user.addEventListener('mouseenter', userHandler);
		user.addEventListener('mouseleave', hideUserInfo);

		ctx.onInvalidated(() => {
			user.removeEventListener('mouseenter', userHandler);
			user.removeEventListener('mouseleave', hideUserInfo);
			if (hideTimeout) {
				clearTimeout(hideTimeout);
			}
		});
	}
};
