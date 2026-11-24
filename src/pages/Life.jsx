import { life } from '../data/index.js';
import Page from '../components/Page.jsx';
import Reveal from '../components/Reveal.jsx';
import LifeVisual from '../components/LifeVisual.jsx';

export default function Life() {
  return (
    <Page>
      <div className="container">
        <section className="page-hero">
          <span className="eyebrow mono rise">Life</span>
          <h1 className="page-title rise" style={{ '--d': '80ms' }}>The branches <em>outside work.</em></h1>
          <p className="rise" style={{ '--d': '180ms' }}>Travel, photography, music, hobbies and the things that make the person behind the work.</p>
        </section>
        <section>
          <div className="life-grid">
            {life.map((c, i) => (
              <Reveal as="article" key={c.id} delay={i * 70} className={`life-card life-card--${i + 1} spot`}>
                {c.image
                  ? <img className="life-media" src={c.image.src} alt={c.image.alt || ''} loading="lazy" />
                  : <LifeVisual id={c.id} />}
                <div className="life-body">
                  <h3>{c.title}</h3>
                  <p>{c.description}</p>
                  <span className="life-tags">{c.tags.join(', ')}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </Page>
  );
}
