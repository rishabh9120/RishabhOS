import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from '@phosphor-icons/react';
import { completed, profile } from '../data/index.js';
import Page from '../components/Page.jsx';
import Reveal from '../components/Reveal.jsx';
import SectionHeading from '../components/SectionHeading.jsx';

export default function Home() {
  return (
    <Page>
      <div className="container">
        {/* Hero: asymmetric split. Text left, the live tree is the visual on the right. */}
        <section className="hero">
          <div className="hero-copy-wrap">
            <span className="eyebrow mono rise" style={{ '--d': '0ms' }}>Builder, researcher, curious human</span>
            <h1 className="hero-title">
              <span className="rise" style={{ '--d': '80ms' }}>I build <em>systems</em></span>{' '}
              <span className="rise" style={{ '--d': '180ms' }}>that matter.</span>
            </h1>
            <p className="hero-copy rise" style={{ '--d': '300ms' }}>
              A personal space for professional work, experiments, research, and the things I build simply because I want to understand them.
            </p>
            <div className="hero-actions rise" style={{ '--d': '400ms' }}>
              <Link to="/work" className="button primary">View work <ArrowUpRight aria-hidden="true" /></Link>
              <a href={`mailto:${profile.email}`} className="button">Contact</a>
            </div>
          </div>
        </section>

        {/* Statement: editorial type, no asset. The second sentence brightens as it scrolls in. */}
        <section className="statement">
          <Reveal as="p" className="statement-text">
            Credentials explain <em>where</em> I've been. <span className="statement-rest">What I build explains what I can do.</span>
          </Reveal>
        </section>

        {/* Paths: asymmetric two-cell bento. */}
        <section className="paths">
          <Reveal>
            <SectionHeading title="Capability, not credentials." note={'Professional experience is the trunk.\nThe Lab is where the evidence branches out.'} />
          </Reveal>
          <div className="paths-grid">
            <Reveal delay={60}>
              <Link to="/work" className="path-card path-card--work spot">
                <span className="mono path-label">Experience</span>
                <strong>Goldman Sachs</strong>
                <p>23 months building and improving systems in a high-stakes engineering environment.</p>
                <ArrowUpRight className="path-arrow" aria-hidden="true" />
              </Link>
            </Reveal>
            <Reveal delay={140}>
              <Link to="/lab" className="path-card path-card--lab spot">
                <span className="mono path-label">The Lab</span>
                <strong>Ideas <ArrowRight className="inline-icon" aria-hidden="true" /><span className="sr-only">to</span> experiments</strong>
                <p>Quant research, Python, automation, ML, apps and the random things worth building.</p>
                {completed.length > 0 && <span className="mono path-count">{completed.length} completed</span>}
                <ArrowUpRight className="path-arrow" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* Closing: centered on purpose, the message is the design. */}
        <section className="closing">
          <Reveal>
            <span className="eyebrow mono">The system</span>
            <h2 className="display">One living tree. <em>Many directions.</em></h2>
            <p>Work, experiments and life don't need to live in separate universes. They are different branches of the same curiosity.</p>
          </Reveal>
        </section>
      </div>
    </Page>
  );
}
