import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Route, useLocation } from 'react-router-dom';
import { ArrowUpRight, List, X } from '@phosphor-icons/react';
import { profile } from '../data/index.js';
import { nav, stageFor } from './routes.js';
import PageTransition from './PageTransition.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import Home from '../pages/Home.jsx';
import Work from '../pages/Work.jsx';
import Lab from '../pages/Lab.jsx';
import ProjectShowcase from '../pages/ProjectShowcase.jsx';
import Life from '../pages/Life.jsx';
import Now from '../pages/Now.jsx';
import Private from '../pages/Private.jsx';
import NotFound from '../pages/NotFound.jsx';

// Three.js is ~95% of the old bundle: load it after first paint, in its own chunk.
const Background3D = lazy(() => import('../three/Background3D.jsx'));

// Spotlight borders: writes --mx/--my straight onto the hovered .spot element
// (no React state, no re-render). Skipped for touch and reduced motion.
function useSpotlight() {
  useEffect(() => {
    const ok = matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)');
    if (!ok.matches) return;
    let raf = 0;
    const onMove = e => {
      const el = e.target.closest?.('.spot');
      if (!el) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => { document.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, []);
}

export default function Layout({ theme, setTheme }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const stage = stageFor(pathname);
  useEffect(() => setMenuOpen(false), [pathname]);
  useSpotlight();

  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={null}><Background3D stage={stage} /></Suspense>
      </ErrorBoundary>
      <div className="vignette" />
      <div className="noise" />

      <header className="nav-wrap">
        <nav className={menuOpen ? 'menu-open' : ''} aria-label="Primary">
          <Link className="brand" to="/"><span>R</span>ishabh <i>Agrawal</i></Link>
          <div className="navlinks" id="primary-links">
            {nav.map(n => <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>)}
          </div>
          <div className="nav-right">
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <a className="nav-cta" href={`mailto:${profile.email}`}>Contact</a>
            <button className="menu-toggle" type="button" aria-controls="primary-links"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen}
              onClick={() => setMenuOpen(v => !v)}>
              {menuOpen ? <X aria-hidden="true" /> : <List aria-hidden="true" />}
            </button>
          </div>
        </nav>
      </header>
      <div className="route-progress"><span style={{ transform: `scaleX(${(18 + stage * 16) / 100})` }} /></div>

      <main id="main" tabIndex={-1}>
        <PageTransition>
          <Route path="/" element={<Home />} />
          <Route path="/work" element={<Work />} />
          <Route path="/lab" element={<Lab />} />
          <Route path="/lab/:slug" element={<ProjectShowcase />} />
          <Route path="/life" element={<Life />} />
          <Route path="/now" element={<Now />} />
          <Route path="/private/*" element={<Private />} />
          <Route path="*" element={<NotFound />} />
        </PageTransition>
      </main>

      <footer>
        <div className="container">
          <div className="footer-top">
            <div>
              <h2 className="display">Let's build <em>something.</em></h2>
            </div>
            <div className="footer-links">
              <a href={`mailto:${profile.email}`}>Contact <ArrowUpRight aria-hidden="true" /></a>
              <a href={profile.github} target="_blank" rel="noreferrer">GitHub <ArrowUpRight aria-hidden="true" /></a>
              <a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight aria-hidden="true" /></a>
              <Link to="/private">Private <ArrowUpRight aria-hidden="true" /></Link>
            </div>
          </div>
          <div className="copyright">
            <span>© {new Date().getFullYear()} Rishabh Agrawal</span>
            <span className="mono">Built with curiosity</span>
          </div>
        </div>
      </footer>
    </>
  );
}
