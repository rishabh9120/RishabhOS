import { Link } from 'react-router-dom';
import { ArrowUpRight } from '@phosphor-icons/react';
import { completed, experience, metrics } from '../data/index.js';
import Page from '../components/Page.jsx';
import Reveal from '../components/Reveal.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import { ProjectTile } from '../components/ProjectCard.jsx';

export default function Work() {
  const featured = completed.slice(0, 2);
  return (
    <Page>
      <div className="container">
        <section className="page-hero">
          <span className="eyebrow mono rise">Work</span>
          <h1 className="page-title rise" style={{ '--d': '80ms' }}>Build proof. <em>Not just a résumé.</em></h1>
          <p className="rise" style={{ '--d': '180ms' }}>Professional experience, education and the evidence behind the way I work.</p>
        </section>

        {/* Experience: timeline */}
        <section>
          <Reveal>
            <SectionHeading title="The professional path" note={'A deliberately compact version.\nThe deeper evidence belongs in the Lab and individual showcases.'} />
          </Reveal>
          <div className="timeline">
            {experience.map((e, i) => (
              <Reveal key={e.org} delay={i * 70} className={`timeline-row${i === 0 ? ' is-lead' : ''}`}>
                <div className="timeline-meta">
                  <span className="year mono">{e.years}</span>
                  <span className="timeline-dot" aria-hidden="true" />
                </div>
                <div>
                  <h3>{e.org}</h3>
                  <p className="role">{e.role}</p>
                  {e.tags && (
                    <div className="timeline-tags">
                      {e.tags.map(t => <span key={t} className="tag mono">{t}</span>)}
                    </div>
                  )}
                </div>
                <p className="summary">{e.summary}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Impact: four-cell bento, first cell is the large one */}
        <section>
          <Reveal><SectionHeading title="Numbers I care about" note="A few outcomes from professional engineering work." /></Reveal>
          <div className="metrics-grid">
            {metrics.map((m, i) => (
              <Reveal key={m.label} delay={i * 70} className={`metric metric--${i + 1} spot`}>
                <div className="metric-header">
                  <span className="metric-idx mono">0{i + 1}</span>
                </div>
                <strong>{m.value}</strong>
                <span>{m.label}</span>
                {m.detail && <p className="metric-detail mono">{m.detail}</p>}
              </Reveal>
            ))}
          </div>
        </section>

        {/* Evidence: real projects when they exist, a composed empty state until then */}
        <section>
          <Reveal><SectionHeading title="Explore the work" note="Full project write-ups live in the Lab." /></Reveal>
          {featured.length > 0 ? (
            <div className="tiles">{featured.map(p => <ProjectTile key={p.slug} p={p} />)}</div>
          ) : (
            <Reveal className="empty">
              <h3>No write-ups published yet.</h3>
              <p>Quant research, Python experiments and apps will be published here as full showcases.</p>
              <Link to="/lab" className="button">Go to the Lab <ArrowUpRight aria-hidden="true" /></Link>
            </Reveal>
          )}
        </section>
      </div>
    </Page>
  );
}
