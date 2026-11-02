import { expect, test } from 'bun:test';
import { render } from 'pele';
import { isMarkdown, renderMarkdown } from '../src/markdown';
import { TEMPLATES } from '../src/templates';

for (const { name, text } of TEMPLATES) {
  test(`the ${name} example draws`, async () => {
    // A document draws if its diagrams do.
    const diagrams = isMarkdown(text) ? renderMarkdown(text).blocks.map((b) => b.text) : [text];
    expect(diagrams.length).toBeGreaterThan(0);
    for (const diagram of diagrams) expect(render(diagram).svg).toStartWith('<svg');
  });
}

test('example names are unique', () => {
  expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
});
