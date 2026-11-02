import { expect, test } from 'bun:test';
import { type DiagramType, render } from 'pele';
import { renderMarkdown } from '../src/markdown';
import { TEMPLATES } from '../src/templates';

// Every type Pele draws except `info`, which only shows Pele's version. Keyed by Pele's own DiagramType,
// so `bun check` fails when a Pele update adds a type that has no example yet.
const TYPES: Record<Exclude<DiagramType, 'info'>, true> = {
  flowchart: true,
  sequence: true,
  class: true,
  state: true,
  er: true,
  pie: true,
  gantt: true,
  gitGraph: true,
  mindmap: true,
  timeline: true,
  journey: true,
  xychart: true,
  quadrantChart: true,
  requirement: true,
  c4: true,
  sankey: true,
  block: true,
  packet: true,
  kanban: true,
  architecture: true,
  radar: true,
  treemap: true,
  agentflow: true,
  usecase: true,
  railroad: true,
  treeView: true,
  venn: true,
  cynefin: true,
  wardley: true,
  swimlane: true,
  ishikawa: true,
  eventmodeling: true,
};

for (const { name, text, mode } of TEMPLATES) {
  test(`the ${name} example draws`, async () => {
    // A document draws if its diagrams do.
    const diagrams = mode === 'markdown' ? renderMarkdown(text).blocks.map((b) => b.text) : [text];
    expect(diagrams.length).toBeGreaterThan(0);
    for (const diagram of diagrams) expect(render(diagram).svg).toStartWith('<svg');
  });
}

test('every diagram type has an example', () => {
  const diagrams = TEMPLATES.filter((t) => t.mode !== 'markdown');
  const drawn = new Set(diagrams.map((t) => render(t.text).type));
  expect(Object.keys(TYPES).filter((type) => !drawn.has(type as DiagramType))).toEqual([]);
});

test('example names are unique', () => {
  expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
});
