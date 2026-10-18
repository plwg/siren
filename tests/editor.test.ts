import { expect, test } from 'bun:test';
import { unfence } from '../src/editor';

test('a pasted ```mermaid block loses its fences', () => {
  expect(unfence('```mermaid\nflowchart LR\n  A --> B\n```')).toBe('flowchart LR\n  A --> B');
  expect(unfence('\n  ```mermaid\nsequenceDiagram\n  A->>B: hi\n  ```\n')).toBe('sequenceDiagram\n  A->>B: hi');
  expect(unfence('~~~ Mermaid title\npie\n  "a": 1\n~~~')).toBe('pie\n  "a": 1');
  expect(unfence('````mermaid\nflowchart LR\n```\nnot the end\n````')).toBe('flowchart LR\n```\nnot the end');
});

test('other text is pasted as it is', () => {
  expect(unfence('flowchart LR\n  A --> B')).toBeNull();
  expect(unfence('```js\nconsole.log(1)\n```')).toBeNull();
  expect(unfence('Some text\n```mermaid\nflowchart LR\n```')).toBeNull();
});
