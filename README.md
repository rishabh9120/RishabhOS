# Rishabh Agrawal — Personal Website

A Vite + React + Three.js personal site designed as a hosted, extensible personal digital world.

## Structure

- `/` — cinematic home and persistent idea-tree visual system
- `/work` — professional experience and evidence
- `/lab` — project archive; intentionally empty at launch
- `/lab/:slug` — full-screen project showcase route
- `/life` — travel, photography and hobbies
- `/now` — current interests

## Add a project

Edit `src/data.js` and add an object to `projects`:

```js
{
  slug: 'my-project',
  title: 'My Project',
  category: 'quant',
  year: '2026',
  description: 'One sentence explaining the question or thing I built.',
  tags: ['Python', 'NumPy'],
  body: 'Write the longer project story here.',
}
```

A project automatically appears in the Lab and gets its own URL at `/lab/my-project`.

## Local development

Requires Node.js 18+.

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
npm run preview
```

## Hosting

This is a standard Vite production project. It can be hosted on Cloudflare Pages, Vercel, Netlify, GitHub Pages (with an appropriate deployment workflow), or any static host.

For Cloudflare Pages:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: 18+ (22 is fine)

The included `public/_redirects` file preserves client-side routes on hosts that support Netlify-style redirects. For Cloudflare Pages, add a Pages `_redirects` rule or use the platform's SPA fallback configuration if needed.

## Personal links

- GitHub: https://github.com/rishabh9120/
- LinkedIn: https://www.linkedin.com/in/rishabh-agrawal-1bbb5a156/
- Email: rishabhagrawal9120@gmail.com
