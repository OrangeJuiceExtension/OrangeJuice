import { apiModule } from '@/utils/api';

export const topLeadersKarma = async (doc: Document) => {
	if (!window.location.pathname.startsWith('/leaders')) {
		return;
	}

	const trs = doc.querySelectorAll('#bigbox .athing');
	if (!trs) {
		return;
	}

	const anchorData: Array<{ anchor: HTMLAnchorElement; user: string }> = [];

	for (const tr of trs) {
		const anchors = tr.querySelectorAll<HTMLAnchorElement>('.hnuser');
		for (const anchor of anchors) {
			if (anchorData.length >= 10) {
				break;
			}
			const user = anchor.textContent.trim();
			if (user) {
				anchorData.push({ anchor, user });
			}
		}
		if (anchorData.length >= 10) {
			break;
		}
	}

	const userInfoResults = await Promise.all(
		anchorData.map(({ user }) => apiModule.getUserInfo(user))
	);

	for (const [index, { anchor }] of anchorData.entries()) {
		const userInfo = userInfoResults[index];
		if (userInfo && anchor.parentElement && anchor.parentElement.nextElementSibling) {
			// @ts-expect-error
			anchor.parentElement.nextElementSibling.textContent = userInfo.karma;
		}
	}
};
