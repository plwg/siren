import { expect, test } from 'bun:test';
import { type DiagramType, render } from 'pele';
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

for (const { name, text } of TEMPLATES) {
  test(`the ${name} example draws`, () => {
    expect(render(text).svg).toStartWith('<svg');
  });
}

test('every diagram type has an example', () => {
  const drawn = new Set(TEMPLATES.map((t) => render(t.text).type));
  expect(Object.keys(TYPES).filter((type) => !drawn.has(type as DiagramType))).toEqual([]);
});

test('example names are unique', () => {
  expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
});
