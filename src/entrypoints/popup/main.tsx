import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './popup-app.tsx';
import './style.css';

// biome-ignore lint/style/noNonNullAssertion: none
const root = document.querySelector('#root')!;

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);
