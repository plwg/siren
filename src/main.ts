import { mount } from 'pele';

const DEFAULT = `flowchart LR
  A[Write Mermaid] --> B{Pele}
  B --> C[SVG]
  C --> D[Share the link]`;

// The diagram lives in the URL hash as base64url-encoded UTF-8, so a link carries it anywhere.
const encode = (text: string): string => {
  let bin = '';
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const decode = (s: string): string => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

const fromHash = (): string | null => {
  try {
    return location.hash.length > 1 ? decode(location.hash.slice(1)) : null;
  } catch {
    return null;
  }
};

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

if (new URLSearchParams(location.search).has('view')) document.body.classList.add('view');

const source = byId<HTMLTextAreaElement>('source');
const status = byId<HTMLSpanElement>('status');
source.value = fromHash() ?? DEFAULT;

const mounted = mount(byId('diagram'), source.value, {
  onRender: () => {
    status.textContent = '';
  },
  onError: (e) => {
    status.textContent = e instanceof Error ? e.message : String(e);
  },
});

let timer: ReturnType<typeof setTimeout> | undefined;
source.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    mounted.update(source.value);
    history.replaceState(null, '', `${location.pathname}${location.search}#${encode(source.value)}`);
  }, 150);
});

window.addEventListener('hashchange', () => {
  const text = fromHash();
  if (text !== null && text !== source.value) {
    source.value = text;
    mounted.update(text);
  }
});

const link = (asView: boolean): string =>
  `${location.origin}${location.pathname}${asView ? '?view' : ''}#${encode(source.value)}`;
const copy = async (text: string, label: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
  status.textContent = `${label} copied`;
};

byId('copy-link').addEventListener('click', () => copy(link(false), 'Link'));
byId('copy-view').addEventListener('click', () => copy(link(true), 'View link'));
byId('download').addEventListener('click', () => {
  const svg = mounted.result?.svg;
  if (!svg) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  a.download = 'diagram.svg';
  a.click();
  URL.revokeObjectURL(a.href);
});
