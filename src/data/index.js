import { projects as rawProjects } from './projects.js';

export { profile } from './profile.js';
export { experience, metrics } from './experience.js';
export { life } from './life.js';
export { now } from './now.js';

export const CATEGORIES = ['quant', 'python', 'ml', 'build', 'side quest'];
export const STATUS_LABEL = { shipped: 'Completed', building: 'In progress', planned: 'Planned' };

// Dev-time guard: a typo'd or duplicate slug used to fail silently. Now it
// throws during `npm run dev` so it is fixed before it ships.
function validate(list) {
  const seen = new Set();
  const problems = [];
  list.forEach((p, i) => {
    const at = `projects[${i}]${p.title ? ` ("${p.title}")` : ''}`;
    if (!p.slug || !/^[a-z0-9-]+$/.test(p.slug)) problems.push(`${at}: slug must be lowercase letters, numbers and hyphens`);
    if (!p.title) problems.push(`${at}: title is required`);
    if (p.slug && seen.has(p.slug)) problems.push(`${at}: duplicate slug "${p.slug}"`);
    seen.add(p.slug);
    if (p.status && !(p.status in STATUS_LABEL)) problems.push(`${at}: status must be shipped, building or planned`);
    if (p.category && !CATEGORIES.includes(p.category)) problems.push(`${at}: category must be one of ${CATEGORIES.join(', ')}`);
  });
  if (problems.length) throw new Error(`Invalid project data:\n- ${problems.join('\n- ')}`);
}
if (import.meta.env.DEV) validate(rawProjects);

// Normalised, newest first.
export const projects = rawProjects
  .map(p => ({ status: 'shipped', category: 'build', tags: [], links: [], ...p }))
  .sort((a, b) => String(b.year || '').localeCompare(String(a.year || '')));

export const completed = projects.filter(p => p.status === 'shipped');
export const upcoming = projects.filter(p => p.status !== 'shipped');
