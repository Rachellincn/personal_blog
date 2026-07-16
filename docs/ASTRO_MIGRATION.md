# Astro migration report

## Scope

The migration replaces repeated static document shells with Astro 7 components while preserving the 21 generated pages and every legacy `.html` URL. All 17 article `<main>` bodies were byte-compared during migration; the only body-level compatibility edit was adding `id="content"` where it was missing so the skip link has a valid target.

### Before

```text
index.html / notes.html / about.html
css/style.css
js/site.js
posts/*.html (17 complete HTML documents)
vercel.json
```

### After

```text
src/components + src/layouts
src/content/notes/*.md (typed frontmatter + preserved article body)
src/pages (static routes, RSS, robots)
src/scripts/playground (shared runtime + three lazy experiment modules)
src/styles/global.css
tests + .github/workflows/ci.yml
astro.config.mjs + vercel.json
```

## Route compatibility

| Legacy path | Result |
|---|---|
| `/`, `/index.html` | generated `index.html` |
| `/notes`, `/notes.html` | rewrite or generated `notes.html` |
| `/about`, `/about.html` | rewrite or generated `about.html` |
| `/playground`, `/playground.html` | rewrite or generated `playground.html` |
| `/posts/<slug>`, `/posts/<slug>.html` | wildcard rewrite or generated post file |

The build-time link audit reports no broken internal links across 122 generated files and assets.

## Performance comparison

Lighthouse 13.4.0 was run with the same simulated mobile profile on the current production homepage and the local production Astro build.

| Metric | Production before | Astro branch |
|---|---:|---:|
| Performance | 59 | 100 |
| Accessibility | 100 | 100 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |
| First Contentful Paint | 6.3 s | 1.5 s |
| Largest Contentful Paint | 7.5 s | 1.5 s |
| Total Blocking Time | 0 ms | 0 ms |
| Cumulative Layout Shift | 0.069 | 0 |

The main improvement comes from self-hosting the existing DM Sans, DM Mono, and Instrument Serif families instead of blocking first render on Google Fonts. Playground modules are split into separate 4–12 KiB JavaScript chunks and are not referenced by the homepage or note pages.

## Validation

- `astro check`: zero errors, warnings, or hints.
- `astro build`: 21 pages generated.
- Link audit: no broken internal links.
- Playwright: 9 tests covering routes, navigation, experiments, mobile overflow, reduced motion, console errors, and deterministic screenshots.
- Browser gut-check: desktop and 390 px mobile render meaningful content, expose expected controls, show no error overlay, and report zero horizontal overflow.

## Deployment and rollback

The branch is deployed only as a Vercel Preview and is never promoted by this workflow. Vercel’s production deployment remains untouched.

Rollback options:

1. Close the Draft PR or delete the preview branch; production is unaffected.
2. If merged later, use Vercel’s prior production deployment or revert the migration commits on `main`.
3. The pre-migration static HTML remains fully recoverable from the parent commit `c76c84c`.
