import React, { type ReactNode, useLayoutEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { version } from '../../../package.json';
import '../../utils/dark-mode.css';
import './hn-template.css';

const TEMPLATE_ROOT_ID = 'oj-hn-template-root';

interface HnTemplateProps {
	bodyRef?: React.Ref<HTMLTableCellElement>;
	footer?: ReactNode;
	nav?: ReactNode;
}

const DefaultNav = () => (
	<table border={0} cellPadding={0} cellSpacing={0} className="oj-hn-nav-table">
		<tbody>
			<tr>
				<td className="oj-hn-logo-cell">
					<a href="https://news.ycombinator.com">
						<img
							alt="Hacker News"
							height={18}
							src="/y18.svg"
							style={{ border: '1px white solid', display: 'block' }}
							width={18}
						/>
					</a>
				</td>
				<td className="oj-hn-links-cell">
					<span className="pagetop">
						<b className="hnname">
							<a href="/news">Hacker News</a>
						</b>
						&nbsp;
					</span>
				</td>
				<td className="oj-hn-login-cell" />
			</tr>
		</tbody>
	</table>
);

const DefaultFooter = () => (
	<div className="oj-hn-footer-center">
		<table cellPadding="1" cellSpacing="0" width="100%">
			<tbody>
				<tr>
					<td style={{ backgroundColor: '#ff6600', height: '2px' }} />
				</tr>
			</tbody>
		</table>
		<br />

		<span className="yclinks">
			<a href="/newsguidelines.html">Guidelines</a>
			{' | '}
			<a href="/newsfaq.html">FAQ</a>
			{' | '}
			<a href="/lists">Lists</a>
			{' | '}
			<a href="https://github.com/HackerNews/API">API</a>
			{' | '}
			<a href="/security.html">Security</a>
			{' | '}
			<a href="https://www.ycombinator.com/legal/">Legal</a>
			{' | '}
			<a href="https://www.ycombinator.com/apply/">Apply to YC</a>
			{' | '}
			<a href="mailto:hn@ycombinator.com">Contact</a>
			{' | '}
			<a href="https://oj-hn.com" rel="noopener" target="_blank" title={version}>
				Orange Juice
			</a>
		</span>
	</div>
);

export const HnTemplate = ({ nav, footer, bodyRef }: HnTemplateProps) => (
	<div className="oj-hn-template">
		<table border={0} cellPadding={0} cellSpacing={0} className="oj-hn-page" width="100%">
			<tbody>
				<tr>
					<td className="oj-hn-nav">{nav ?? <DefaultNav />}</td>
				</tr>
				<tr>
					<td className="oj-hn-body" ref={bodyRef} />
				</tr>
				<tr>
					<td className="oj-hn-footer">{footer ?? <DefaultFooter />}</td>
				</tr>
			</tbody>
		</table>
	</div>
);

interface HnTemplateRootProps {
	bodyNodes: Node[];
	footer?: ReactNode;
	nav?: ReactNode;
}

const HnTemplateRoot = ({ nav, footer, bodyNodes }: HnTemplateRootProps) => {
	const bodyRef = useRef<HTMLTableCellElement>(null);
	const stableNodes = useMemo(() => bodyNodes, [bodyNodes]);

	useLayoutEffect(() => {
		const container = bodyRef.current;
		if (!container || container.childNodes.length > 0) {
			return;
		}
		for (const node of stableNodes) {
			container.appendChild(node);
		}
	}, [stableNodes]);

	return <HnTemplate bodyRef={bodyRef} footer={footer} nav={nav} />;
};

interface WrapOptions {
	footer?: ReactNode;
	nav?: ReactNode;
}

export const wrapBodyWithHnTemplate = (doc: Document, options: WrapOptions = {}): void => {
	if (doc.getElementById(TEMPLATE_ROOT_ID)) {
		return;
	}

	const bodyNodes = Array.from(doc.body.childNodes);
	const root = doc.createElement('div');
	root.id = TEMPLATE_ROOT_ID;
	doc.body.replaceChildren(root);

	const reactRoot = createRoot(root);
	reactRoot.render(
		<HnTemplateRoot bodyNodes={bodyNodes} footer={options.footer} nav={options.nav} />
	);
};
