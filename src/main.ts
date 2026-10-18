import { mount } from 'pele';
import { type Exported, exportSvg, svgToPng } from './export';
import { exportOptions, initMenu } from './menu';
import { initThemes, linkTheme } from './theme';
import pkg from '../package.json';

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
initThemes();
const menu = initMenu();

const source = byId<HTMLTextAreaElement>('source');
const status = byId<HTMLSpanElement>('status');
const diagram = byId('diagram');
source.value = fromHash() ?? DEFAULT;

const say = (text: string, error = false): void => {
  status.textContent = text;
  status.classList.toggle('error', error);
};

const mounted = mount(diagram, source.value, {
  onRender: () => say(''),
  onError: (e) => say(e instanceof Error ? e.message : String(e), true),
});

// Pele measures labels in the page's fonts, so draw again once the web fonts arrive.
void document.fonts.ready.then(() => mounted.refresh());

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

// A view link carries an explicitly chosen theme, so an embedded diagram looks the way it was shared.
const link = (asView: boolean): string => {
  const params: string[] = [];
  if (asView) params.push('view');
  const theme = linkTheme();
  if (asView && theme) params.push(`theme=${theme}`);
  const query = params.length ? `?${params.join('&')}` : '';
  return `${location.origin}${location.pathname}${query}#${encode(source.value)}`;
};
const copy = async (text: string, label: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
    say(`${label} copied`);
  } catch {
    say(`Couldn't copy the ${label.toLowerCase()}. Copy it from the address bar instead.`, true);
  }
};

byId('pele-version').textContent = pkg.dependencies.pele;

// Each menu action closes the menu and reports back in the header.
const action = (id: string, run: () => unknown): void =>
  byId(id).addEventListener('click', () => {
    menu.close();
    void run();
  });

// The diagram drawn for export, or null after telling the user why it can't be.
const exported = (): Exported | null => {
  try {
    return exportSvg(source.value, exportOptions());
  } catch {
    say('Fix the diagram before exporting it.', true);
    return null;
  }
};

const download = (blob: Blob, name: string): void => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

action('copy-link', () => copy(link(false), 'Link'));
action('copy-view', () => copy(link(true), 'View link'));
action('download-svg', () => {
  const result = exported();
  if (result) download(new Blob([result.svg], { type: 'image/svg+xml' }), 'diagram.svg');
});
action('download-png', async () => {
  const result = exported();
  if (result) download(await svgToPng(result), 'diagram.png');
});
action('copy-image', async () => {
  const result = exported();
  if (!result) return;
  try {
    // The item is made inside the click, with the PNG still to come, as Safari requires.
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': svgToPng(result) })]);
    say('Image copied');
  } catch {
    say("Couldn't copy the image here. Download a PNG instead.", true);
  }
});
