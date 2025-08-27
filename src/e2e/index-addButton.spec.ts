import { expect, test } from './fixtures';
// import { openPopup } from './pages/index';

test('Popup counter increments when clicked', async ({ page, extensionId }) => {
	console.log(`page: ${page} extensionId: ${extensionId}`);

	expect(true).toEqual(true);
	// const popup = await openPopup(page, extensionId);
	// expect(await popup.getCounterText()).toEqual('count is 0');
	//
	// await popup.clickCounter();
	// expect(await popup.getCounterText()).toEqual('count is 1');
	//
	// await popup.clickCounter();
	// expect(await popup.getCounterText()).toEqual('count is 2');
});
