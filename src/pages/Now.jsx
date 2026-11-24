import { now } from '../data/index.js';
import Page from '../components/Page.jsx';
import Reveal from '../components/Reveal.jsx';

export default function Now() {
  return (
    <Page>
      <div className="container">
        <section className="page-hero">
          <span className="eyebrow mono rise">Now</span>
          <h1 className="page-title rise" style={{ '--d': '80ms' }}>What the tree <em>is growing today.</em></h1>
          <p className="rise" style={{ '--d': '180ms' }}>A living snapshot. This page is meant to change as interests, projects and priorities change.</p>
        </section>
        <section>
          <div className="now-grid">
            {now.map((n, i) => (
              <Reveal key={n.label} delay={i * 70} className="now-cell spot">
                <div className="now-header">
                  <b className="mono">{n.label}</b>
                  <span className="now-pulse-beacon" aria-hidden="true" />
                </div>
                <span>{n.text}</span>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}
