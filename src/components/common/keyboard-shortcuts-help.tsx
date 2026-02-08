import { createRoot } from 'react-dom/client';
import './keyboard-shortcuts-help.css';

const SHORTCUTS_COMMENTS = [
	{ key: 'j / J', description: 'Move down / expands collapsed' },
	{ key: 'k / K', description: 'Move up / expands collapsed' },
	{ key: 'n', description: 'Go to next sibling comment' },
	{ key: 'p', description: 'Go to previous sibling comment' },
	{ key: 'c', description: 'Collapse/expand comment thread' },
	{ key: 'r', description: 'Reply to selected comment' },
	{ key: 'u', description: 'Upvote selected comment' },
	{ key: 'd', description: 'Downvote selected comment' },
	{ key: 'f', description: 'Favorite selected comment' },
	{ key: 'X', description: 'Flag selected comment' },
	{ key: '0-9', description: 'Open reference link by number' },
	{ key: 't', description: 'Scroll to top of page' },
	{ key: 'b', description: 'Go back (if paginated)' },
	{ key: 'esc', description: 'Unfocus comment or close reply box' },
];

const SHORTCUTS_STORIES = [
	{ key: '↑ / ↓', description: 'Move up / down' },
	{ key: '←', description: 'Open story comments (new tab)' },
	{ key: '⇧ + ←', description: 'Open story comments' },
	{ key: '→', description: 'Open story url (new tab)' },
	{ key: '⇧ + →', description: 'Open story url' },
	{ key: 'j / k', description: 'Move down / up' },
	{ key: 'Enter', description: 'Open selected story in new tab' },
	{ key: 'O', description: 'Open story and comments in new tabs' },
	{ key: 'u', description: 'Upvote selected story' },
	{ key: 'f', description: 'Favorite selected story' },
	{ key: 'X', description: 'Flag selected story' },
	{ key: 'r', description: 'Reply to story (go to comments)' },
	{ key: '1-9, 0', description: 'Open story at position 1-10' },
	{ key: 'm', description: 'Click more link' },
	{ key: 'b', description: 'Go back (if paginated)' },
	{ key: 'h', description: 'Toggle hide read stories checkbox' },
	{ key: 'H', description: 'Hide read stories' },
	{ key: 'esc', description: 'Unfocus story' },
];

const SHORTCUTS_COMMON = [
	{ key: 'H', description: 'Home' },
	{ key: 'S', description: 'Submit' },
	{ key: 'O', description: 'Show' },
	{ key: 'A', description: 'Ask' },
	{ key: 'N', description: 'New' },
	{ key: 'P', description: 'Profile' },
	{ key: 'T', description: 'Threads' },
	{ key: '?', description: 'Show help dialog' },
	{ key: 'esc', description: 'Hide help dialog' },
];

const LOGO_PATH = '/assets/image-128.png';
const WEBSITE_URL = 'https://oj-hn.com';
const EMAIL = 'hello@oj-hn.com';
const GITHUB_URL = 'https://github.com/OrangeJuiceExtension/OrangeJuice';

const getLogoUrl = () => {
	return `${WEBSITE_URL}${LOGO_PATH}`;
};

const KeyboardShortcutsTable = ({
	shortcuts,
}: {
	shortcuts: { key: string; description: string }[];
}) => (
	<table className="oj-shortcuts-help__table">
		<tbody>
			{shortcuts.map(({ key, description }) => (
				<tr key={`${key}-${description}`}>
					<td className="oj-shortcuts-help__key">{key}</td>
					<td className="oj-shortcuts-help__desc">{description}</td>
				</tr>
			))}
		</tbody>
	</table>
);

export const KeyboardShortcutsHelp = () => (
	<div className="oj-shortcuts-help">
		<div className="oj-shortcuts-help__row oj-shortcuts-help__row--top">
			<div className="oj-shortcuts-help__brand">
				<img
					alt="Orange Juice logo"
					className="oj-shortcuts-help__logo"
					height={128}
					src={getLogoUrl()}
					width={128}
				/>
				<div className="oj-shortcuts-help__links">
					<a href={WEBSITE_URL} rel="noreferrer" target="_blank">
						Website
					</a>
					<a href={GITHUB_URL} rel="noreferrer" target="_blank">
						GitHub
					</a>
					<a
						href={`mailto:${EMAIL}?subject=Question about OJ`}
						rel="noreferrer"
						target="_blank"
					>
						Email
					</a>
				</div>
			</div>
			<div className="oj-shortcuts-help__column">
				<h2 className="oj-shortcuts-help__heading">Navigation shortcuts</h2>
				<div className="oj-shortcuts-help__note">(requires alt or ⌥)</div>
				<KeyboardShortcutsTable shortcuts={SHORTCUTS_COMMON} />
			</div>
		</div>
		<div className="oj-shortcuts-help__row">
			<div className="oj-shortcuts-help__column">
				<h2 className="oj-shortcuts-help__heading">Stories shortcuts</h2>
				<KeyboardShortcutsTable shortcuts={SHORTCUTS_STORIES} />
			</div>
			<div className="oj-shortcuts-help__column">
				<h2 className="oj-shortcuts-help__heading">Comments shortcuts</h2>
				<KeyboardShortcutsTable shortcuts={SHORTCUTS_COMMENTS} />
			</div>
		</div>
	</div>
);

export const getKeyboardShortcutsHelp = (doc: Document): HTMLElement => {
	const container = doc.createElement('div');
	const reactRoot = createRoot(container);
	reactRoot.render(<KeyboardShortcutsHelp />);
	return container;
};
