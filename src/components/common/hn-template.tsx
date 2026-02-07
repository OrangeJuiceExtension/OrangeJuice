import React, { type ReactNode, useLayoutEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const TEMPLATE_ROOT_ID = 'oj-hn-template-root';

interface HnTemplateProps {
	nav?: ReactNode;
	footer?: ReactNode;
	bodyRef?: React.Ref<HTMLTableCellElement>;
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
		</span>
	</div>
);

export const HnTemplate = ({ nav, footer, bodyRef }: HnTemplateProps) => (
	<div className="oj-hn-template">
		<style>{`
			body { background: #ffffff; }
			.oj-hn-template {
				font-family: Verdana, Geneva, sans-serif;
				font-size: 10pt;
				color: #000;
			}
			.oj-hn-page {
				width: 85%;
				margin: 8px auto 24px;
				background: #f6f6ef;
			}
			.oj-hn-nav {
				background: #ff6600;
				padding: 2px 4px 2px 2px;
				font-weight: normal;
				color: #000;
			}
			.oj-hn-nav a {
				color: #000;
				text-decoration: none;
			}
			.oj-hn-nav .hnname a {
				font-weight: bold;
			}
			.oj-hn-nav-table {
				width: 100%;
			}
			.oj-hn-logo-cell {
				width: 18px;
				padding-right: 4px;
			}
			.oj-hn-links-cell {
				padding-left: 4px;
			}
			.oj-hn-login-cell {
				text-align: right;
				padding-right: 4px;
			}
			.pagetop {
				font-size: 10pt;
				line-height: 12px;
			}
			.oj-hn-body {
				background: #f6f6ef;
				padding: 16px 0 16px 16px;
			}
			.oj-hn-footer {
				color: #828282;
				font-size: 8pt;
				padding: 12px 0 20px;
			}
			.oj-hn-footer-center {
				text-align: center;
			}
			.oj-hn-footer a {
				color: #828282;
				text-decoration: none;
			}
		`}</style>
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
	nav?: ReactNode;
	footer?: ReactNode;
	bodyNodes: Node[];
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
	nav?: ReactNode;
	footer?: ReactNode;
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
