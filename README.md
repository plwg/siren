# Siren

Render Mermaid diagrams in the browser with [Pele](https://github.com/obsidianmd/pele).

Live at https://plwg.github.io/siren/

<img alt="Siren in Lighthouse, the high-contrast theme: Mermaid source on the left, the rendered flowchart on the right" src="docs/screenshots/desktop-contrast.png">

**Lighthouse**, the high-contrast theme: pure black and white with a single signal yellow, heavier strokes and strong focus rings. **Auto** picks it when your system asks for more contrast.

<table>
  <tr>
    <td valign="top"><img alt="Shallows light theme" src="docs/screenshots/desktop-light.png" width="400"></td>
    <td valign="top"><img alt="Deep dark theme" src="docs/screenshots/desktop-dark.png" width="400"></td>
  </tr>
  <tr>
    <td>Shallows (light)</td>
    <td>Deep (dark)</td>
  </tr>
</table>

<p>
  <img alt="Phone layout showing the Diagram tab" src="docs/screenshots/phone-diagram.png" width="200">
  <img alt="Phone layout in Lighthouse with the menu open" src="docs/screenshots/phone-menu.png" width="200">
</p>

- Type Mermaid on the left; the diagram renders on the right.
- On phones, **Code** and **Diagram** tabs show one at a time at full height; the theme switcher and credits move into the ☰ menu.
- The diagram is saved in the URL hash, so a link always carries it.
- Themes: **Shallows** (light), **Deep** (dark), **Lighthouse** (high contrast), or **Auto** to follow the system. Add `?theme=light|dark|contrast` to a link to force one.
- The ☰ menu holds sharing and export:
  - **Copy link** opens the editor with the diagram; **Copy view link** shows only the diagram, in the theme you picked.
  - **Copy image** puts a PNG on the clipboard to paste into documents; **SVG** and **PNG** download files.
  - Exports ignore the editor theme. Choose **Sea** or **Neutral** colors, **Light** or **Dark**, and a **Clear** or **Solid** background. Text is set in Arial so it fits in any document app.

## Develop

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev        # local dev server
bun run typecheck
bun run build      # outputs to dist/
```

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/pages.yml`.
