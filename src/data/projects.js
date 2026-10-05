/**
 * Lab projects. Everything here is bundled into the public JS: no secrets,
 * private links or unpublished work.
 *
 * Each entry gets a route at /lab/<slug>. Status decides where it appears on /lab:
 *   'shipped'  -> "Completed" section
 *   'building' -> "Upcoming" section, tagged "In progress"
 *   'planned'  -> "Upcoming" section, tagged "Planned"
 *
 * Fields (required: slug, title):
 * {
 *   slug:        'unique-url-safe-id',
 *   title:       'Project name',
 *   status:      'shipped' | 'building' | 'planned',   // default 'shipped'
 *   category:    'quant' | 'python' | 'ml' | 'build' | 'side quest',
 *   year:        '2026',
 *   description: 'One-sentence summary shown on the card and at the top of the page.',
 *   tags:        ['Python', 'pandas'],
 *   links:       [{ label: 'Source', href: 'https://github.com/...' }, { label: 'Live', href: 'https://...' }],
 *   cover:       { src: '/projects/my-project.jpg', alt: '...' },   // 16:9, put the file in /public/projects/
 *   body:        'Longer write-up (string) or JSX.',
 * }
 *
 * Example (copy, edit, remove this comment block when you add the first real one):
 * {
 *   slug: 'volatility-surface-explorer',
 *   title: 'Volatility Surface Explorer',
 *   status: 'building',
 *   category: 'quant',
 *   year: '2026',
 *   description: 'Interactive tool for visualising implied volatility surfaces from options chain data.',
 *   tags: ['Python', 'NumPy', 'Plotly'],
 * }
 */
export const projects = [];
