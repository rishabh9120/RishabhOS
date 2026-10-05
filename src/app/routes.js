// Top nav links, in display order. Labels and paths are frozen (SEO + muscle memory).
export const nav = [
  { to: '/', label: 'Home' }, { to: '/work', label: 'Work' }, { to: '/lab', label: 'Lab' },
  { to: '/life', label: 'Life' }, { to: '/now', label: 'Now' }
];

// Maps the URL to a "stage" (0 = home, 1-5 = sections). The 3D background
// uses it to pick which branch the camera focuses on.
export const stageFor = p =>
  p.startsWith('/work') ? 1 : p.startsWith('/lab') ? 2 : p.startsWith('/life') ? 3 :
  p.startsWith('/now') ? 4 : p.startsWith('/private') ? 5 : 0;
