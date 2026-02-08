import { useCallback, useState } from 'react';

import reactLogo from '~/assets/react.svg';
import './App.css';

const App = () => {
	const [count, setCount] = useState(0);

	const updateCount = useCallback(() => setCount((count) => count + 1), []);

	return (
		<>
			<div>
				<a href="https://wxt.dev" rel="noreferrer" target="_blank">
					<img alt="WXT logo" className="logo" height={32} width={32} />
				</a>
				<a href="https://react.dev" rel="noreferrer" target="_blank">
					<img
						alt="React logo"
						className="logo react"
						height={32}
						src={reactLogo}
						width={32}
					/>
				</a>
			</div>
			<h1>WXT + React</h1>
			<div className="card">
				<button onClick={updateCount} type="button">
					counts is {count}
				</button>
				<p>
					Edit <code>src/App.tsx</code> and save to test HMR
				</p>
			</div>
			<p className="read-the-docs">Click on the WXT and React logos to learn more</p>
		</>
	);
};

export { App };
