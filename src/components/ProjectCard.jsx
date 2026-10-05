import { Link } from 'react-router-dom';
import { ArrowUpRight } from '@phosphor-icons/react';
import { STATUS_LABEL } from '../data/index.js';

// Cover image if provided, otherwise a tinted block (no fake screenshots).
function Cover({ p }) {
  return p.cover?.src
    ? <img className="tile-cover" src={p.cover.src} alt={p.cover.alt || ''} loading="lazy" />
    : <div className="tile-cover tile-cover--empty" aria-hidden="true" />;
}

export function ProjectTile({ p }) {
  return (
    <Link to={`/lab/${p.slug}`} className="tile spot">
      <Cover p={p} />
      <div className="tile-body">
        <span className="mono tile-meta">{p.category}, {p.year}</span>
        <h3>{p.title}</h3>
        {p.description && <p>{p.description}</p>}
      </div>
      <ArrowUpRight className="tile-arrow" aria-hidden="true" />
    </Link>
  );
}

export function ProjectRow({ p }) {
  return (
    <Link to={`/lab/${p.slug}`} className="project-row">
      <span className="tag mono">{STATUS_LABEL[p.status]}</span>
      <div>
        <h3>{p.title}</h3>
        {p.description && <p>{p.description}</p>}
      </div>
      <ArrowUpRight className="row-arrow" aria-hidden="true" />
    </Link>
  );
}
