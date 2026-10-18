import { expect, test } from 'bun:test';
import { render } from 'pele/lazy';
import { ready } from '../src/engine';
import { TEMPLATES } from '../src/templates';

for (const { name, text } of TEMPLATES) {
  test(`the ${name} example draws`, async () => {
    await ready(text);
    expect(render(text).svg).toStartWith('<svg');
  });
}

test('example names are unique', () => {
  expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
});
