import { renderPopupApp } from './popup-app.tsx';
import './style.css';

// biome-ignore lint/style/noNonNullAssertion: none
const root = document.querySelector<HTMLElement>('#root')!;
await renderPopupApp(document, root);
