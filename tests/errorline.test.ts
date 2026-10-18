import { expect, test } from 'bun:test';
import { render } from 'pele/lazy';
import { ready } from '../src/engine';
import { errorLine } from '../src/errorline';

const lineOf = async (text: string): Promise<number | null> => {
  await ready(text);
  try {
    render(text);
  } catch (error) {
    return errorLine(text, error);
  }
  throw new Error('expected a parse error');
};

test('an error in the middle', async () => {
  expect(await lineOf('flowchart LR\n  A --> B\n  B --> ]]\n  C --> D')).toBe(3);
});

test('after front matter, directives and comments', async () => {
  expect(await lineOf('---\ntitle: X\n---\nflowchart LR\n  A --> B\n  B --> ]]\n  C --> D')).toBe(6);
  expect(await lineOf('%%{init: {"theme": "dark"}}%%\n%% note\nflowchart LR\n  A --> B\n  B --> ]]\n  C --> D')).toBe(
    5,
  );
});

test('a diagram that ends too soon points at its last line', async () => {
  expect(await lineOf('flowchart LR\n  A --> B\n  B -->')).toBe(3);
  expect(await lineOf('flowchart LR\n  A[oops --> B\n\n')).toBe(2);
});

test('the same text earlier in the diagram is not mistaken for the error', async () => {
  expect(await lineOf('flowchart LR\n  B --> C\n  A --> B\n  B --> C ]]')).toBe(4);
});

test('errors without a location give null', () => {
  expect(errorLine('flowchart LR', new Error('plain'))).toBeNull();
  expect(errorLine('flowchart LR', { line: 0, snippet: '' })).toBeNull();
});
