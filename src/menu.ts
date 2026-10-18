import { DEFAULT_EXPORT, type ExportOptions } from './export';

// The share and export menu: a popover under the header, and the export options it remembers.

const STORAGE_KEY = 'siren-export';
const ALLOWED: { [K in keyof ExportOptions]: readonly ExportOptions[K][] } = {
  palette: ['sea', 'neutral'],
  mode: ['light', 'dark'],
  background: ['clear', 'solid'],
};
const KEYS = Object.keys(ALLOWED) as (keyof ExportOptions)[];

// Keeps only saved values that are still valid options.
const load = (): ExportOptions => {
  const options = { ...DEFAULT_EXPORT };
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    for (const key of KEYS) {
      const value = saved[key];
      if ((ALLOWED[key] as readonly unknown[]).includes(value)) Object.assign(options, { [key]: value });
    }
  } catch {
    // Unreadable storage leaves the defaults.
  }
  return options;
};

const options = load();

/** The export options as currently chosen in the menu. */
export const exportOptions = (): ExportOptions => ({ ...options });

export function initMenu(): { close: () => void } {
  const menu = document.getElementById('menu') as HTMLElement;
  const button = document.getElementById('menu-button') as HTMLButtonElement;

  // Hang the menu just below its button, wherever the header has wrapped to.
  menu.addEventListener('beforetoggle', (event) => {
    if ((event as ToggleEvent).newState === 'open') {
      menu.style.setProperty('--menu-top', `${button.getBoundingClientRect().bottom + 6}px`);
    }
  });
  menu.addEventListener('toggle', (event) => {
    button.setAttribute('aria-expanded', String((event as ToggleEvent).newState === 'open'));
  });

  for (const key of KEYS) {
    for (const radio of menu.querySelectorAll<HTMLInputElement>(`input[name="export-${key}"]`)) {
      radio.checked = radio.value === options[key];
      radio.addEventListener('change', () => {
        Object.assign(options, { [key]: radio.value });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
        } catch {
          // Storage can be blocked; the choice still applies for this visit.
        }
      });
    }
  }

  return { close: () => menu.hidePopover() };
}
