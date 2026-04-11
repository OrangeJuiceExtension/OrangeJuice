export const ACTION_BUTTON_CLASS = 'oj-action-button';
export const ACTION_BUTTON_STYLE_ID = 'oj-action-button-style';

export const getActionButtonStyle = () => `
	.${ACTION_BUTTON_CLASS} {
		min-width: 72px;
		padding: 3px 10px;
		border: 1px solid #b8b0a4;
		border-radius: 999px;
		background: linear-gradient(180deg, #fffdf8 0%, #f0ece3 100%);
		color: #5f564a;
		font-size: 12px;
		line-height: 1.2;
		text-align: center;
		cursor: pointer;
		transition:
			background 120ms ease,
			border-color 120ms ease,
			color 120ms ease,
			transform 120ms ease,
			box-shadow 120ms ease;
	}

	.${ACTION_BUTTON_CLASS}:hover {
		border-color: #9e9487;
		background: linear-gradient(180deg, #ffffff 0%, #e9e2d6 100%);
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.08);
		transform: translateY(-1px);
	}

	.${ACTION_BUTTON_CLASS}:active {
		transform: translateY(0);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
	}

	html.oj-dark-mode .${ACTION_BUTTON_CLASS} {
		border-color: #5c5447;
		background: linear-gradient(180deg, #3a342b 0%, #2f2a23 100%);
		color: #d6cec2;
	}

	html.oj-dark-mode .${ACTION_BUTTON_CLASS}:hover {
		border-color: #7a705f;
		background: linear-gradient(180deg, #463f35 0%, #383127 100%);
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.24);
	}

	html.oj-dark-mode .${ACTION_BUTTON_CLASS}:active {
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
	}
`;
