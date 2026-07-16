# Ganlin's Field Notes

Ganlin Xiang’s bilingual academic blog for physics, mathematical methods, and AI for Science. The site is statically generated with Astro and deployed on Vercel. It preserves the original `.html` URLs while centralizing shared layout, metadata, navigation, and note indexing.

## Physics Playground

`/playground.html` contains three native Canvas + TypeScript instruments:

- Projectile Target — analytic, drag-to-aim ballistic motion with target scoring and local best score.
- Double Pendulum — coupled nonlinear equations integrated with fixed-step RK4, plus a nearby-initial-state chaos comparison.
- Wave Lab — single/double-source damped wave superposition with displacement, intensity, and equal-phase displays.

The experiments dynamically import only on the Playground page. They share animation, DPR resize, visibility, reduced-motion, controls, readout, persistence, and destroy lifecycles. See [docs/PHYSICS_PLAYGROUND.md](docs/PHYSICS_PLAYGROUND.md) for the models and extension guide.

## Project structure

```text
src/
├── components/            # Header, navigation, note cards, research visual, lab shell
├── content/notes/         # Typed note collection; original article bodies are preserved
├── layouts/BaseLayout.astro
├── pages/                 # Legacy-compatible static routes, RSS, robots, sitemap input
├── scripts/
│   ├── playground/core/   # Shared loop, canvas, math, controls, lifecycle contracts
│   └── playground/games/  # Projectile, double pendulum, wave lab
└── styles/global.css
tests/                     # Playwright navigation, interaction, a11y-mode, mobile, visual checks
docs/PHYSICS_PLAYGROUND.md
vercel.json
```

Before migration, the repo had repeated headers/footers across `index.html`, `notes.html`, `about.html`, and 17 files under `posts/`. After migration, Astro components own the shell and the note collection owns article metadata and bodies.

## Local development

```bash
npm install
npm run dev
```

Production-equivalent verification:

```bash
npm run check
npm run build
npm run check:links
npx playwright install chromium
npm test
```

## Adding a note

Create `src/content/notes/my-note.md` with the schema in `src/content.config.ts`. The Notes page, RSS feed, sitemap, category metadata, and `/posts/my-note.html` route are generated automatically. KaTeX delimiters use `$…$` and `$$…$$`; article headings receive anchors, and formulas/code blocks receive copy controls in the browser.

## Deployment

Vercel detects Astro, runs `npm run build`, and publishes `dist/`. Non-production branches create Preview Deployments through the connected Git integration. Production promotion is intentionally outside this feature branch workflow.

## Compatibility routes

| Public path | Generated or rewritten target |
|---|---|
| `/`, `/index.html` | `dist/index.html` |
| `/notes`, `/notes.html` | `dist/notes.html` |
| `/about`, `/about.html` | `dist/about.html` |
| `/playground`, `/playground.html` | `dist/playground.html` |
| `/posts/:slug`, `/posts/:slug.html` | `dist/posts/:slug.html` |
