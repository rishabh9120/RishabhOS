# RishabhOS

Personal digital world built with Vite, React and Three.js. Routes and
navigation stay the same; the background is a procedurally generated,
recursively-branching cherry-blossom tree that the camera moves through as
you navigate between sections.

## Local
```bash
npm install
npm run dev
npm run build
npm run preview
```

## Deploying
Two configs are included:
- **Cloudflare** (`wrangler.jsonc`): build command `npm run build`, output
  directory `dist`. Security headers come from `public/_headers`, which
  Vite copies into `dist/_headers` automatically.
- **Vercel** (`vercel.json`): the same headers are duplicated there, because
  Vercel does not read `_headers` files - it needs its own `headers` array.
  If you add or change a header, update both files.

## What changed in this pass

**Theme system** (`src/main.jsx`, `useTheme`) - now follows the OS light/dark
setting live until the visitor explicitly toggles it, persists that explicit
choice, stays in sync across open tabs, and no longer flashes the wrong
theme on first load (`public/theme-init.js`, loaded from `index.html`,
sets `data-theme` before the stylesheet or React finish loading).

**Background tree** (`src/main.jsx`, `buildTree`) - rebuilt as genuine
recursive branching (parent → children → grandchildren) instead of three
nested loops with fixed counts: primary limbs are placed in a golden-angle
spiral around the trunk so they don't clump on one side, each fork has an
"apical leader" that continues roughly the parent's direction while
siblings peel off at wider, fully-3D angles, and outer twigs droop slightly
more with depth (a weeping-cherry look). Generation is seeded, so the shape
is the same on every load rather than a new random result each visit.

**Comments** - every non-trivial function in `src/main.jsx` now explains
what it does and why, `src/data.js` documents the project schema, and
`src/styles.css` has section banners marking which page each rule block
belongs to.

## Security & roadmap notes

A few things worth doing before this grows past a static portfolio:

- **`/private` has no real authentication yet.** The route exists in the
  client-side router only, which means its markup ships in the public JS
  bundle regardless of the URL - "hidden" is not "protected". Put it behind
  Cloudflare Access (or an equivalent auth proxy) *before* adding anything
  sensitive (finance data, personal dashboards, etc.), not after.
- **Dependencies are now pinned** (`package.json` used `"latest"` for
  React, Vite, React Router and the Vite React plugin, which means every
  fresh `npm install` could silently pull in a newer, unreviewed, and
  potentially breaking or vulnerable version). They're pinned to specific
  versions now - bump them deliberately, and run `npm audit` periodically.
- **Security headers exist in two places** (`public/_headers` for
  Cloudflare, `headers` in `vercel.json` for Vercel) because the hosts
  read different files. They now include a real Content-Security-Policy,
  HSTS, and `X-Frame-Options` in addition to the headers that were already
  there. If the CSP ever needs loosening (e.g. adding an analytics script
  or a new font host), update it in both files.
- **The contact email is plaintext** in `src/data.js` and in the built JS
  bundle, so it will get scraped by bots eventually. Fine for now; if spam
  becomes a problem, route contact through a form backed by a small
  serverless function instead of a `mailto:` link.
- **Three.js dominates the bundle size** (~750KB of the ~790KB JS bundle).
  It's currently loaded eagerly on every route. Worth lazy-loading
  `Background3D` with `React.lazy()`/dynamic `import()` so the initial
  page load doesn't need to fetch and parse Three.js before showing any
  content, especially on slow connections/mobile.
- **No error boundary around the 3D background.** If WebGL is unavailable
  (disabled, unsupported browser, driver issue) or the tree-building code
  throws, it currently takes down the whole app instead of just failing to
  render the background. Worth wrapping `Background3D` in a React error
  boundary (or a `try/catch` + WebGL feature check) that falls back to a
  plain background.
- **Adding projects to `src/data.js`** is manual and unchecked - a typo'd
  or duplicate `slug` fails silently (last one wins / 404s). If the list
  grows, consider a small dev-time check (or converting to TypeScript) that
  asserts slugs are unique and required fields are present.
- **No sitemap/robots.txt** yet, and Open Graph tags now exist but have no
  `og:image`. Worth adding both once there's real content on `/work` and
  `/lab` worth indexing/sharing.
- **No CI.** Even a minimal GitHub Action running `npm run build` on every
  PR would catch breakages (like a bad edit to `data.js`) before they reach
  production.

Keep `/private/*` behind Cloudflare Access before adding sensitive data.
