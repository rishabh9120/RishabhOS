/**
 * RishabhOS entry point.
 *
 *   src/app/        App root, Layout (nav, footer, routes), route/nav config
 *   src/pages/      One file per route
 *   src/components/ Shared UI
 *   src/three/      Procedural cherry-blossom tree + the lazy-loaded background
 *   src/theme/      Light/dark theme hook
 *   src/data/       All editable content (projects, experience, life, now, profile)
 *   src/styles/     Tokens, base, chrome, components, per-page CSS
 */
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/playfair-display/wght-italic.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import './styles/index.css';
import App from './app/App.jsx';

createRoot(document.getElementById('root')).render(<App />);
