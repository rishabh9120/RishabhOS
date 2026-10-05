import { useEffect, useRef, useState } from 'react';
import { Routes, useLocation } from 'react-router-dom';
import { stageFor } from './routes.js';

/* Page change = exit, swap while invisible, enter.
   - The OUTGOING page stays mounted and animates out (opacity + transform only).
   - Direction follows the nav order: going to a later section slides out left and
     the new page in from the right, earlier is the reverse; same-section changes
     (e.g. Lab -> a project) move vertically.
   - The scroll reset and keyboard-focus move happen at the swap, while nothing is
     visible, so there is no jump and screen readers land on the new page.
   - prefers-reduced-motion: swap instantly, no animation.
   Timings must match styles/base.css (.stage--exit / .stage--enter). */
const EXIT_MS = 220, ENTER_MS = 560, SLIDE = 36;

export default function PageTransition({ children }) {
  const location = useLocation();
  const [shown, setShown] = useState(location);
  const [phase, setPhase] = useState('idle');                   // idle | exit | enter
  const [vec, setVec] = useState({ ox: 0, oy: -12, ix: 0, iy: 16 });
  const shownRef = useRef(location);
  shownRef.current = shown;

  useEffect(() => {
    const current = shownRef.current;
    if (location.pathname === current.pathname) { if (location !== current) setShown(location); return; }

    const swap = () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      setShown(location);
      document.getElementById('main')?.focus({ preventScroll: true });
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { swap(); return; }

    const dir = Math.sign(stageFor(location.pathname) - stageFor(current.pathname));
    setVec(dir ? { ox: -dir * SLIDE, oy: 0, ix: dir * SLIDE, iy: 0 } : { ox: 0, oy: -12, ix: 0, iy: 16 });
    setPhase('exit');
    const t1 = setTimeout(() => { swap(); setPhase('enter'); }, EXIT_MS);
    const t2 = setTimeout(() => setPhase('idle'), EXIT_MS + ENTER_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [location]);

  return (
    <div className={`stage stage--${phase}`}
      style={{ '--out-x': `${vec.ox}px`, '--out-y': `${vec.oy}px`, '--in-x': `${vec.ix}px`, '--in-y': `${vec.iy}px` }}>
      <Routes location={shown}>{children}</Routes>
    </div>
  );
}
