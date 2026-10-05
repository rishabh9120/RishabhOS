import { useMemo, useState } from 'react';
import { CATEGORIES, completed, upcoming } from '../data/index.js';
import Page from '../components/Page.jsx';
import Reveal from '../components/Reveal.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import { ProjectRow, ProjectTile } from '../components/ProjectCard.jsx';

export default function Lab() {
  const [filter, setFilter] = useState('all');
  const pick = list => (filter === 'all' ? list : list.filter(p => p.category === filter));
  const done = useMemo(() => pick(completed), [filter]);
  const next = useMemo(() => pick(upcoming), [filter]);
  const hasAny = completed.length + upcoming.length > 0;

  return (
    <Page>
      <div className="container">
        <section className="page-hero">
          <span className="eyebrow mono rise">The Lab</span>
          <h1 className="page-title rise" style={{ '--d': '80ms' }}>Things I build <em>because I can.</em></h1>
          <p className="rise" style={{ '--d': '180ms' }}>
            Quant research. Python scripts. Automation. ML. Apps. Experiments. Side quests. If it starts with &ldquo;I wonder if&hellip;&rdquo;, it belongs here.
          </p>
        </section>

        {hasAny && (
          <div className="filters" role="group" aria-label="Filter by category">
            {['all', ...CATEGORIES].map(c => (
              <button key={c} type="button" aria-pressed={filter === c} className={filter === c ? 'active' : ''} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>
        )}

        <section>
          <Reveal><SectionHeading title="Completed" /></Reveal>
          {done.length > 0
            ? <div className="tiles">{done.map(p => <ProjectTile key={p.slug} p={p} />)}</div>
            : <Reveal className="empty"><h3>{!hasAny ? 'No completed projects yet.' : filter === 'all' ? 'Nothing completed yet.' : 'Nothing completed in this category yet.'}</h3><p>Finished experiments get their own page here, with the write-up, code and results.</p></Reveal>}
        </section>

        <section>
          <Reveal><SectionHeading title="Upcoming" /></Reveal>
          {next.length > 0
            ? <div className="project-list">{next.map(p => <ProjectRow key={p.slug} p={p} />)}</div>
            : <Reveal className="empty"><h3>{!hasAny ? 'The next experiments will be listed here.' : filter === 'all' ? 'Nothing upcoming right now.' : 'Nothing upcoming in this category.'}</h3><p>Projects appear here while they are in progress, before they ship.</p></Reveal>}
        </section>
      </div>
    </Page>
  );
}
