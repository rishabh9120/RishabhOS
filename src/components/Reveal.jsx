import { createElement, useEffect, useRef } from 'react';

/* Scroll reveal. One shared IntersectionObserver (no scroll listeners).
   The hidden state only exists under prefers-reduced-motion: no-preference
   (see styles/components.css), so reduced-motion visitors get static content. */
let io;
const observer = () => io || (io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); } });
}, { rootMargin: '0px 0px -6% 0px', threshold: 0 }));

export default function Reveal({ as = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) { el.setAttribute('data-in', ''); return; }
    observer().observe(el);
    return () => io && io.unobserve(el);
  }, []);
  return createElement(as, { ref, className, 'data-reveal': '', style: delay ? { '--d': `${delay}ms` } : undefined, ...rest }, children);
}
