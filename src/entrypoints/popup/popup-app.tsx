import { useEffect, useState } from 'react';
import lStorage from '@/utils/local-storage.ts';
import './App.css';

const DARK_MODE_STORAGE_KEY = 'oj_dark_mode';
const LOGO_PATH = 'https://oj-hn.com/assets/image-128.png';

type PopupTheme = 'dark' | 'light';

const App = () => {
	const [theme, setTheme] = useState<PopupTheme>('light');

	useEffect(() => {
		let isMounted = true;

		const readTheme = async (): Promise<void> => {
			const storedTheme = await lStorage.getItem<PopupTheme>(DARK_MODE_STORAGE_KEY);
			if (!(isMounted && storedTheme)) {
				return;
			}

			if (storedTheme === 'dark' || storedTheme === 'light') {
				setTheme(storedTheme);
			}
		};

		readTheme().catch(() => undefined);

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<main className={`oj-popup oj-popup--${theme}`}>
			<section className="oj-popup__card">
				<img
					alt="Orange Juice logo"
					className="oj-popup__logo"
					height={128}
					src={LOGO_PATH}
					width={128}
				/>
				<h1 className="oj-popup__title">Coming Soon</h1>
				<p className="oj-popup__text">
					The Orange Juice popup is on the way. Suggestions welcome!
				</p>
			</section>
		</main>
	);
};

export { App };
