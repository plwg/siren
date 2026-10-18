import { expect, test } from 'bun:test';
import { clampWidth, parseShare } from '../src/split';

test('saved splits are read only when sensible', () => {
  expect(parseShare('0.35')).toBe(0.35);
  expect(parseShare(null)).toBeNull();
  expect(parseShare('')).toBeNull();
  expect(parseShare('wide')).toBeNull();
  expect(parseShare('0.02')).toBeNull();
  expect(parseShare('1.5')).toBeNull();
});

test('neither pane gets too narrow', () => {
  expect(clampWidth(500, 1200)).toBe(500);
  expect(clampWidth(50, 1200)).toBe(240);
  expect(clampWidth(1150, 1200)).toBe(920);
  expect(clampWidth(Number.POSITIVE_INFINITY, 1200)).toBe(920);
  // A window too narrow for both minimums keeps the editor usable.
  expect(clampWidth(400, 400)).toBe(240);
});
