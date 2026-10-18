import { expect, test } from 'bun:test';

// Ad and annoyance blockers hide elements by ID and class name. Brave's social-media filter hid
// the menu's Share section when its ID was "menu-share", so keep these words out of names.
const BAIT = /share|social|sponsor|advert|banner|promo|popup|cookie|newsletter/i;

test('no ID or class looks like something blockers hide', async () => {
  const names: string[] = [];
  for (const file of ['index.html', 'about/index.html']) {
    const html = await Bun.file(file).text();
    for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) names.push(`#${id}`);
    for (const [, list] of html.matchAll(/\bclass="([^"]+)"/g))
      for (const c of list?.split(/\s+/) ?? []) names.push(`.${c}`);
  }
  expect(names.length).toBeGreaterThan(20);
  expect(names.filter((name) => BAIT.test(name))).toEqual([]);
});
