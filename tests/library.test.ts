import { describe, expect, test } from 'bun:test';
import { ago, type Entry, parseEntries, titleOf, upsert } from '../src/library';
import { TEMPLATES } from '../src/templates';

const entry = (id: string, at = 0): Entry => ({ id, text: `flowchart LR\n  ${id}`, at });

describe('saved entries', () => {
  test('only well-formed entries are kept', () => {
    const raw = JSON.stringify([
      entry('a'),
      { id: 'b', text: 5, at: 0 },
      { id: 'c', text: 'x', at: 'later' },
      null,
      'nope',
      { id: 'd', text: 'x'.repeat(60_000), at: 0 },
      entry('e'),
    ]);
    expect(parseEntries(raw).map((e) => e.id)).toEqual(['a', 'e']);
  });

  test('unreadable storage gives no entries', () => {
    expect(parseEntries(null)).toEqual([]);
    expect(parseEntries('{not json')).toEqual([]);
    expect(parseEntries('{"id": "a"}')).toEqual([]);
  });

  test('an edited entry moves to the top without repeating, and the list stays short', () => {
    let entries: Entry[] = [];
    for (const id of ['a', 'b', 'c']) entries = upsert(entries, entry(id));
    entries = upsert(entries, { ...entry('a'), text: 'changed' });
    expect(entries.map((e) => e.id)).toEqual(['a', 'c', 'b']);
    expect(entries[0]?.text).toBe('changed');
    for (let i = 0; i < 20; i++) entries = upsert(entries, entry(`n${i}`));
    expect(entries).toHaveLength(8);
  });
});

describe('names', () => {
  test('type and first label', () => {
    expect(titleOf('flowchart TD\n  start([Idea]) --> draft[Write a draft]')).toBe('Flowchart · Idea');
    expect(titleOf('%% note\nsequenceDiagram\n  actor You')).toBe('Sequence');
    expect(titleOf('erDiagram\n  A ||--o{ B : has')).toBe('Entity relationship');
  });

  test('a title wins over labels', () => {
    expect(titleOf('pie title Time spent\n  "Thinking" : 45')).toBe('Pie · Time spent');
    expect(titleOf('gantt\n  title Release plan\n  section Build')).toBe('Gantt · Release plan');
  });

  test('long details are shortened, and unknown types are capitalized', () => {
    expect(titleOf(`flowchart LR\n  A[${'x'.repeat(60)}]`)).toBe(`Flowchart · ${'x'.repeat(39)}…`);
    expect(titleOf('sankey-beta\n')).toBe('Sankey-beta');
  });

  test('every example has a name', () => {
    for (const t of TEMPLATES) expect(titleOf(t.text)).toStartWith(t.name === 'Git graph' ? 'Git graph' : t.name);
  });
});

test('times read naturally', () => {
  const now = Date.UTC(2026, 9, 18, 12);
  expect(ago(now - 20_000, now)).toBe('just now');
  expect(ago(now - 5 * 60_000, now)).toBe('5 min ago');
  expect(ago(now - 3 * 3_600_000, now)).toBe('3 h ago');
  expect(ago(now - 26 * 3_600_000, now)).toBe('yesterday');
  expect(ago(now - 4 * 86_400_000, now)).toBe('4 days ago');
  expect(ago(now - 30 * 86_400_000, now)).toMatch(/Sep/);
});
