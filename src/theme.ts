// Themes are resolved before first paint by the inline script in index.html; this module keeps
// them in sync afterwards: the switcher, the saved choice, and system changes while on Auto.

const THEMES = ['light', 'dark', 'contrast'] as const;
type Theme = (typeof THEMES)[number];
type Choice = Theme | 'auto';

const STORAGE_KEY = 'siren-theme';
const isTheme = (value: string | null): value is Theme => THEMES.includes(value as Theme);

const contrastQuery = matchMedia('(prefers-contrast: more)');
const darkQuery = matchMedia('(prefers-color-scheme: dark)');

const systemTheme = (): Theme => (contrastQuery.matches ? 'contrast' : darkQuery.matches ? 'dark' : 'light');

const saved = (): Choice => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isTheme(value) ? value : 'auto';
  } catch {
    return 'auto';
  }
};

const save = (choice: Choice): void => {
  try {
    if (choice === 'auto') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage can be blocked; the theme still applies for this visit.
  }
};

// The theme chosen in the switcher, or the one a `?theme=` link asked for.
let choice: Choice = (() => {
  const fromUrl = new URLSearchParams(location.search).get('theme');
  return isTheme(fromUrl) ? fromUrl : saved();
})();

const apply = (): void => {
  document.documentElement.dataset.theme = choice === 'auto' ? systemTheme() : choice;
};

/** The explicit theme to carry in a shared link, or null when following the system. */
export const linkTheme = (): Theme | null => (choice === 'auto' ? null : choice);

export function initThemes(): void {
  const radios = document.querySelectorAll<HTMLInputElement>('input[name="theme"]');
  for (const radio of radios) {
    radio.checked = radio.value === choice;
    radio.addEventListener('change', () => {
      choice = radio.value as Choice;
      save(choice);
      apply();
      // A choice made here replaces any theme the link arrived with.
      const url = new URL(location.href);
      if (url.searchParams.has('theme')) {
        url.searchParams.delete('theme');
        history.replaceState(null, '', url);
      }
    });
  }
  const onSystemChange = (): void => {
    if (choice === 'auto') apply();
  };
  contrastQuery.addEventListener('change', onSystemChange);
  darkQuery.addEventListener('change', onSystemChange);
  apply();
}
