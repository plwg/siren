import { expect, test } from 'bun:test';
import { type DiagramType, render } from 'pele';
import { TEMPLATES } from '../src/templates';

// Every type Pele draws except `info`, which only shows Pele's version.
const TYPES: DiagramType[] = [
  'flowchart',
  'sequence',
  'class',
  'state',
  'er',
  'pie',
  'gantt',
  'gitGraph',
  'mindmap',
  'timeline',
  'journey',
  'xychart',
  'quadrantChart',
  'requirement',
  'c4',
  'sankey',
  'block',
  'packet',
  'kanban',
  'architecture',
  'radar',
  'treemap',
  'agentflow',
  'usecase',
  'railroad',
  'treeView',
  'venn',
  'cynefin',
  'wardley',
  'swimlane',
  'ishikawa',
  'eventmodeling',
];

for (const { name, text } of TEMPLATES) {
  test(`the ${name} example draws`, () => {
    expect(render(text).svg).toStartWith('<svg');
  });
}

test('every diagram type has an example', () => {
  const drawn = new Set(TEMPLATES.map((t) => render(t.text).type));
  expect(TYPES.filter((type) => !drawn.has(type))).toEqual([]);
});

test('example names are unique', () => {
  expect(new Set(TEMPLATES.map((t) => t.name)).size).toBe(TEMPLATES.length);
});
