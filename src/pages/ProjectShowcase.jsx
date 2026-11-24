import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from '@phosphor-icons/react';
import { projects, STATUS_LABEL } from '../data/index.js';
import Page from '../components/Page.jsx';
import ProjectInteractiveWidget from '../components/ProjectInteractiveWidget.jsx';

export default function ProjectShowcase() {
  const { slug } = useParams();
  const p = projects.find(x => x.slug === slug);

  if (!p) {
    return (
      <Page>
        <div className="container">
          <section className="page-hero">
            <span className="eyebrow mono">Lab</span>
            <h1 className="page-title">This branch <em>doesn't exist yet.</em></h1>
            <p>There is no project at this address.</p>
            <Link to="/lab" className="button"><ArrowLeft aria-hidden="true" /> All projects</Link>
          </section>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="container">
        <section className="project-showcase">
          <Link to="/lab" className="back mono"><ArrowLeft aria-hidden="true" /> All experiments</Link>
          <span className="eyebrow mono">{p.category}, {p.year}</span>
          <h1 className="page-title">{p.title}</h1>
          <p className="lead">{p.description}</p>
          <div className="showcase-meta">
            <span className="tag mono">{STATUS_LABEL[p.status]}</span>
            {p.links.map(l => (
              <a key={l.href} className="button" href={l.href} target="_blank" rel="noreferrer">{l.label} <ArrowUpRight aria-hidden="true" /></a>
            ))}
          </div>

          <div className="showcase-interactive-wrap">
            <ProjectInteractiveWidget slug={p.slug} />
          </div>

          {p.cover?.src && <img className="showcase-cover" src={p.cover.src} alt={p.cover.alt || ''} />}
          <div className="showcase-grid">
            <aside>{p.tags.map(t => <span key={t} className="tag mono">{t}</span>)}</aside>
            <article>{p.body}</article>
          </div>
        </section>
      </div>
    </Page>
  );
}
