import { describe, expect, it } from 'vitest';
import { hideBody, showBody } from '@/components/common/hide-body.ts';

describe('hideBody', () => {
	it('adds and removes the hide style', () => {
		document.body.innerHTML = '';

		hideBody(document);
		const style = document.getElementById('oj-hide-body');
		expect(style).toBeTruthy();

		showBody(document);
		expect(document.getElementById('oj-hide-body')).toBeNull();
	});

	it('does not add duplicate styles', () => {
		document.body.innerHTML = '';

		hideBody(document);
		hideBody(document);

		const styles = document.querySelectorAll('#oj-hide-body');
		expect(styles).toHaveLength(1);
	});
});
