/**
 * Site content that isn't hard-coded into the page components.
 *
 * `projects` powers the /lab and /lab/:slug pages: every entry here
 * automatically gets a filter chip on /lab and its own showcase route.
 * Keep this file free of secrets (API keys, private links, unpublished
 * work) - it's bundled into the public JS and shipped to every visitor.
 *
 * Project shape (all fields optional except title/slug):
 * {
 *   slug:        'unique-url-safe-id',      // becomes /lab/unique-url-safe-id
 *   title:       'Project name',
 *   category:    'quant' | 'python' | 'ml' | 'build' | 'side quest',
 *   year:        '2026',
 *   description: 'One-sentence summary shown in the list and at the top of the showcase.',
 *   tags:        ['Python', 'pandas'],      // shown as small pills on the showcase page
 *   body:        <>JSX or a string with the fuller writeup</>,
 * }
 *
 * Example (copy/paste and edit):
 * {
 *   slug: 'volatility-surface-explorer',
 *   title: 'Volatility Surface Explorer',
 *   category: 'quant',
 *   year: '2026',
 *   description: 'Interactive tool for visualising implied volatility surfaces from options chain data.',
 *   tags: ['Python', 'NumPy', 'Plotly'],
 *   body: 'Longer writeup goes here...',
 * }
 */
export const projects = [];

// Contact links used in the nav bar and footer. `email` is rendered in
// plaintext as a `mailto:` link, which means it's readable by scrapers that
// crawl the built site - expect some spam. If that becomes a problem,
// consider routing contact through a form (e.g. a small serverless
// function) instead of exposing the address directly.
export const profile = {
  email: 'rishabhagrawal9120@gmail.com',
  github: 'https://github.com/rishabh9120/',
  linkedin: 'https://www.linkedin.com/in/rishabh-agrawal-1bbb5a156/'
};
