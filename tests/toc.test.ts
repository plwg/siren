import { expect, test } from 'bun:test';
import { outline } from '../src/toc';

test('levels count from the shallowest heading present', () => {
  expect(
    outline([
      { level: 2, text: 'Goal' },
      { level: 3, text: ' Detail ' },
      { level: 2, text: 'Schedule' },
    ]),
  ).toEqual([
    { level: 0, text: 'Goal' },
    { level: 1, text: 'Detail' },
    { level: 0, text: 'Schedule' },
  ]);
});

test('empty headings are left out', () => {
  expect(
    outline([
      { level: 1, text: '  ' },
      { level: 2, text: 'Only' },
    ]),
  ).toEqual([{ level: 0, text: 'Only' }]);
});
