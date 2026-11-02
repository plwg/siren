import { replaceText } from './editor';
import { documentTitle } from './markdown';
import type { EditorMode } from './mode';
import { TEMPLATES } from './templates';

// Examples to start from, and the diagrams you worked on recently. Recent diagrams are kept only in
// this browser's storage. Editing updates the diagram's own entry instead of adding one per edit;
// starting another diagram first keeps the current one, so nothing is lost without undo.

const STORAGE_KEY = 'siren-recent';
const MAX_ENTRIES = 8;
// As long as a link can carry (see hash.ts); documents can be longer than any diagram.
const MAX_TEXT = 200_000;

export interface Entry {
  id: string;
  text: string;
  at: number;
  /** Absent in entries saved before Siren had modes, which are all diagrams. */
  mode?: EditorMode;
}

export const modeOf = (entry: Entry): EditorMode => (entry.mode === 'markdown' ? 'markdown' : 'mermaid');

/** Saved entries, keeping only well-formed ones. */
export function parseEntries(raw: string | null): Entry[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (e): e is Entry =>
          typeof e === 'object' &&
          e !== null &&
          typeof e.id === 'string' &&
          typeof e.text === 'string' &&
          e.text.length <= MAX_TEXT &&
          typeof e.at === 'number' &&
          Number.isFinite(e.at) &&
          (e.mode === undefined || e.mode === 'mermaid' || e.mode === 'markdown'),
      )
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

/** The entries with this one first, replacing any older copy of it or of its text. */
export const upsert = (entries: Entry[], entry: Entry): Entry[] =>
  [
    entry,
    // The same text again, as when a link is opened twice, is one entry.
    ...entries.filter((e) => e.id !== entry.id && !(e.text === entry.text && modeOf(e) === modeOf(entry))),
  ].slice(0, MAX_ENTRIES);

const TYPE_NAMES: Record<string, string> = {
  flowchart: 'Flowchart',
  graph: 'Flowchart',
  sequenceDiagram: 'Sequence',
  classDiagram: 'Class',
  stateDiagram: 'State',
  'stateDiagram-v2': 'State',
  erDiagram: 'Entity relationship',
  gantt: 'Gantt',
  pie: 'Pie',
  mindmap: 'Mindmap',
  timeline: 'Timeline',
  gitGraph: 'Git graph',
  journey: 'User journey',
  quadrantChart: 'Quadrant chart',
  xychart: 'XY chart',
  'xychart-beta': 'XY chart',
  requirementDiagram: 'Requirement',
  C4Context: 'C4',
  C4Container: 'C4',
  C4Component: 'C4',
  C4Dynamic: 'C4',
  C4Deployment: 'C4',
  'block-beta': 'Block',
  'packet-beta': 'Packet',
  architecture: 'Architecture',
  'architecture-beta': 'Architecture',
  radar: 'Radar',
  'radar-beta': 'Radar',
  treemap: 'Treemap',
  'treemap-beta': 'Treemap',
  agentflow: 'Agent flow',
  'agentflow-beta': 'Agent flow',
  usecase: 'Use case',
  'usecase-beta': 'Use case',
  railroad: 'Railroad',
  'railroad-beta': 'Railroad',
  'railroad-ebnf-beta': 'Railroad',
  'railroad-abnf-beta': 'Railroad',
  'railroad-peg-beta': 'Railroad',
  treeView: 'Tree view',
  'treeView-beta': 'Tree view',
  venn: 'Venn',
  'venn-beta': 'Venn',
  cynefin: 'Cynefin',
  'cynefin-beta': 'Cynefin',
  wardley: 'Wardley map',
  'wardley-beta': 'Wardley map',
  swimlane: 'Swimlane',
  'swimlane-beta': 'Swimlane',
  ishikawa: 'Ishikawa',
  'ishikawa-beta': 'Ishikawa',
  eventmodeling: 'Event modeling',
};

const shorten = (text: string): string => (text.length > 40 ? `${text.slice(0, 39)}…` : text);

/** A short name for a diagram (its type, and its title or first label) or a document (its heading). */
export function titleOf(text: string, mode: EditorMode = 'mermaid'): string {
  if (mode === 'markdown') return shorten(documentTitle(text)) || 'Untitled document';
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%') && l !== '---');
  const word = lines[0]?.match(/^[\w-]+/)?.[0] ?? '';
  const type = TYPE_NAMES[word] ?? (word ? word[0]?.toUpperCase() + word.slice(1) : 'Diagram');
  const title = text.match(/^\s*(?:\w+\s+)?title:?\s+(.+)$/m)?.[1];
  // A node's label: brackets right after its name, closed on the same line; or quoted text.
  const label = lines
    .slice(1)
    .join('\n')
    .match(/\w[[({]+"?([^\])}"\n]+?)"?[\])}]+|"([^"\n]+)"/);
  const detail = (title ?? label?.slice(1).find(Boolean) ?? '').trim().replace(/^"(.*)"$/, '$1');
  const short = shorten(detail);
  return short ? `${type} · ${short}` : type;
}

/** When an entry was last edited, as people say it. */
export function ago(at: number, now: number): string {
  const minutes = Math.round((now - at) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const newId = (): string =>
  typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const load = (): Entry[] => {
  try {
    return parseEntries(localStorage.getItem(STORAGE_KEY));
  } catch {
    return [];
  }
};

const store = (entries: Entry[]): void => {
  try {
    if (entries.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be blocked or full; recent diagrams are a convenience.
  }
};

export interface Library {
  /** Notes that the text drew, so it can be kept. Call after edits settle. */
  saved(text: string): void;
  /** Starts a new entry, for a diagram that arrived from a link. */
  arrived(): void;
  /** Keeps the current text and starts a new entry, before something else is opened; says if it kept any. */
  opening(): boolean;
  /** The most recent text kept in this mode, which edits then update; null if there is none. */
  resume(mode: EditorMode): string | null;
  /** Shows the examples for the current mode. */
  modeChanged(): void;
}

// The menu shows the examples and recent entries of the mode being edited.
export function initLibrary(
  source: HTMLTextAreaElement,
  pristine: string[],
  mode: () => EditorMode,
  onLoad: (message: string) => void,
): Library {
  const select = document.getElementById('template') as HTMLSelectElement;
  const list = document.getElementById('recent') as HTMLOListElement;
  const empty = document.getElementById('recent-empty') as HTMLElement;
  const clear = document.getElementById('recent-clear') as HTMLButtonElement;
  const menu = document.getElementById('menu') as HTMLElement;
  // Untouched examples and the default diagram aren't worth keeping.
  const untouched = new Set([...pristine, ...TEMPLATES.map((t) => t.text)]);
  // Each mode has its own text, so each has its own entry being edited.
  const current: Record<EditorMode, string> = { mermaid: newId(), markdown: newId() };

  /** Saves the text under the current entry; says whether there was anything worth saving. */
  const keep = (text: string): boolean => {
    if (untouched.has(text) || !text.trim()) return false;
    store(upsert(load(), { id: current[mode()], text, at: Date.now(), mode: mode() }));
    return true;
  };

  const show = (): void => {
    const entries = load().filter((entry) => modeOf(entry) === mode());
    const now = Date.now();
    list.replaceChildren(
      ...entries.map((entry) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        const name = document.createElement('span');
        name.textContent = titleOf(entry.text, mode());
        const time = document.createElement('time');
        time.dateTime = new Date(entry.at).toISOString();
        time.textContent = ago(entry.at, now);
        button.append(name, time);
        if (entry.id === current[mode()]) button.setAttribute('aria-current', 'true');
        button.addEventListener('click', () => {
          if (entry.id === current[mode()]) return;
          keep(source.value);
          current[mode()] = entry.id;
          replaceText(source, entry.text);
          menu.hidePopover();
        });
        item.append(button);
        return item;
      }),
    );
    empty.hidden = entries.length > 0;
    clear.hidden = entries.length === 0;
  };

  const listExamples = (): void => {
    select.length = 1;
    for (const [i, template] of TEMPLATES.entries()) {
      if ((template.mode ?? 'mermaid') === mode()) select.add(new Option(template.name, String(i)));
    }
  };
  listExamples();
  select.addEventListener('change', () => {
    const template = TEMPLATES[Number(select.value)];
    select.value = '';
    if (!template) return;
    const kept = keep(source.value);
    current[mode()] = newId();
    replaceText(source, template.text);
    menu.hidePopover();
    const name = template.name.toLowerCase();
    const previous = mode() === 'markdown' ? 'document' : 'diagram';
    onLoad(`Started from the ${name} example.${kept ? ` Your previous ${previous} is in Recent.` : ''}`);
  });
  clear.addEventListener('click', () => {
    store([]);
    show();
  });
  menu.addEventListener('beforetoggle', (event) => {
    if ((event as ToggleEvent).newState === 'open') show();
  });

  return {
    saved: (text) => {
      keep(text);
    },
    arrived: () => {
      current[mode()] = newId();
    },
    opening: () => {
      const kept = keep(source.value);
      current[mode()] = newId();
      return kept;
    },
    resume: (which) => {
      const entry = load().find((e) => modeOf(e) === which);
      if (!entry) return null;
      current[which] = entry.id;
      return entry.text;
    },
    modeChanged: listExamples,
  };
}
