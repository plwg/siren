// On phones the header keeps one row: the mode and theme switchers and the credits move into the
// menu, and the code and the preview take turns at full height. Moving the elements, rather than
// copying them, keeps one set of controls and their state.

const narrow = matchMedia('(max-width: 720px)');

export function initLayout(): void {
  const header = document.querySelector('header') as HTMLElement;
  const main = document.querySelector('main') as HTMLElement;
  const themes = document.querySelector('.themes') as HTMLElement;
  const modes = document.querySelector('.modes') as HTMLElement;
  const title = header.querySelector('h1') as HTMLElement;
  const modeSection = document.getElementById('menu-mode') as HTMLElement;
  const footer = document.querySelector('footer') as HTMLElement;
  const menuButton = document.getElementById('menu-button') as HTMLElement;
  const appearance = document.getElementById('menu-appearance') as HTMLElement;
  const about = document.getElementById('menu-about') as HTMLElement;

  const view = document.body.classList.contains('view');
  const place = (): void => {
    document.body.classList.toggle('floating-status', view || narrow.matches);
    if (narrow.matches) {
      modeSection.append(modes);
      appearance.append(themes);
      about.append(footer);
    } else {
      title.after(modes);
      header.insertBefore(themes, menuButton);
      main.after(footer);
    }
  };
  narrow.addEventListener('change', place);
  place();

  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="pane"]')) {
    radio.addEventListener('change', () => {
      document.body.dataset.pane = radio.value;
      if (radio.value === 'code') document.getElementById('source')?.focus();
    });
  }
}
