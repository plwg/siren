# Siren

Render Mermaid diagrams in the browser with [Pele](https://github.com/obsidianmd/pele).

Live at https://plwg.github.io/siren/

- Type Mermaid on the left; the diagram renders on the right.
- The diagram is saved in the URL hash, so **Copy link** shares it.
- **Copy view link** shares a diagram-only page (`?view`).
- **Download SVG** saves the rendered diagram in the current theme's colors.
- Themes: **Shallows** (light), **Deep** (dark), **Lighthouse** (high contrast), or **Auto** to follow the system. Add `?theme=light|dark|contrast` to a link to force one; view links carry the chosen theme.

## Develop

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev        # local dev server
bun run typecheck
bun run build      # outputs to dist/
```

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/pages.yml`.
