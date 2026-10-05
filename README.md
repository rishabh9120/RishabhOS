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

## Project layout

```
src/
  main.jsx          entry: fonts, styles, <App />
  app/              App root, Layout (nav, footer, routes), nav + stage config
  pages/            one file per route (Home, Work, Lab, ProjectShowcase, Life, Now, Private, NotFound)
  components/       shared UI (Reveal, SectionHeading, ProjectCard, ThemeToggle, ErrorBoundary, Page)
  three/            procedural cherry-blossom tree (tree.js) + the lazy-loaded Background3D
  theme/            useTheme (mirrors public/theme-init.js, keep the two in sync)
  data/             ALL editable content: projects, experience, life, now, profile
  styles/           tokens, base, chrome, components, then one file per page area
```

## Adding a project

Edit `src/data/projects.js` (the schema is documented at the top of the file).
Every entry gets a page at `/lab/<slug>`. `status` decides where it shows on `/lab`:
`shipped` appears under **Completed**, `building` and `planned` under **Upcoming**.
`npm run dev` throws a readable error on a duplicate slug, bad status or bad category.

Photos: put project covers in `public/projects/` and Life photos in `public/life/`,
then reference them from the data files (sizes are noted in each file).

## Design notes

- **Brand** (unchanged): pink accent `#ff9fbd` (dark) / `#d9658d` (light), Inter + Playfair Display
  italic + DM Mono, the "R-ishabh *Agrawal*" wordmark, the tree. `--accent-ink` is a deeper pink used
  only for small text in light mode, because the brand pink is 3.03:1 there.
- **Shape rule:** interactive controls are pills; surfaces and tags are square.
- **Motion:** all timings are delta-time based (identical at 60 and 144Hz). Everything honours
  `prefers-reduced-motion` (the tree renders one still frame per route, page changes swap instantly).
  - *Tree* (`src/three/Background3D.jsx`, tuning knobs at the top): grows in from the roots on load
    (quick replay later in the same session), blossoms bloom as twigs finish, wind with gusts,
    camera flight on route change (dolly, FOV breathe, slight roll) that lights up the whole focused
    limb and releases a petal burst, scroll and pointer parallax, click for a gust of petals.
  - *Pages* (`src/app/PageTransition.jsx` + `.stage--*` in `styles/base.css`): the old page animates out,
    swaps while invisible (scroll reset and focus move to `<main>` happen there), the new page enters.
    Direction follows nav order. Keep `EXIT_MS` / `ENTER_MS` in sync with the CSS durations.
  - *Pointer/section effects:* CSS scroll reveals, spotlight cards, hover and active feedback.
- **Fonts are self-hosted** (`@fontsource`), so the CSP allows no third-party font hosts.
- **Layout rule:** text lives on the left; the tree owns the right. Keep new copy out of the trunk area.

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
  or a new font host), update it in both files. Fonts are now self-hosted, so `font-src` is `'self'`.
- **The contact email is plaintext** in `src/data/profile.js` and in the built JS
  bundle, so it will get scraped by bots eventually. Fine for now; if spam
  becomes a problem, route contact through a form backed by a small
  serverless function instead of a `mailto:` link.
- **Three.js is lazy-loaded** (done): the initial JS is ~84KB gzipped; the ~137KB gzipped Three.js chunk loads after first paint.
- **The 3D background is guarded** (done): WebGL feature check plus an error boundary fall back to a plain gradient.
- **Project data is validated** (done) in dev; see `src/data/index.js`.
- **No sitemap/robots.txt** yet, and Open Graph tags now exist but have no
  `og:image`. Worth adding both once there's real content on `/work` and
  `/lab` worth indexing/sharing.
- **No CI.** Even a minimal GitHub Action running `npm run build` on every
  PR would catch breakages (like a bad edit to `data.js`) before they reach
  production.

Keep `/private/*` behind Cloudflare Access before adding sensitive data.
