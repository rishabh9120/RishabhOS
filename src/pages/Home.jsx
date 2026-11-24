import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Sparkle, Cpu, Waveform, Compass } from '@phosphor-icons/react';
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
            <div className="hero-pill-badge mono rise" style={{ '--d': '0ms' }}>
              <span className="pulse-beacon" aria-hidden="true" />
              <span>Goldman Sachs · IIM Indore · VNIT CSE</span>
            </div>
            <span className="eyebrow mono rise" style={{ '--d': '60ms' }}>Builder, researcher, curious human</span>
            <h1 className="hero-title">
              <span className="rise" style={{ '--d': '120ms' }}>I build <em>systems</em></span>{' '}
              <span className="rise" style={{ '--d': '200ms' }}>that matter.</span>
            </h1>
            <p className="hero-copy rise" style={{ '--d': '300ms' }}>
              A personal digital world for high-performance engineering, quantitative research, ML experiments, and systems built from curiosity.
            </p>
            <div className="hero-actions rise" style={{ '--d': '400ms' }}>
              <Link to="/work" className="button primary">View work <ArrowUpRight aria-hidden="true" /></Link>
              <a href={`mailto:${profile.email}`} className="button">Contact</a>
            </div>

            <div className="hero-tags rise" style={{ '--d': '480ms' }}>
              <span className="hero-tag mono">Distributed Systems</span>
              <span className="hero-tag mono">Quant Models</span>
              <span className="hero-tag mono">Automation & ML</span>
              <span className="hero-tag mono">Procedural 3D</span>
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
                <div className="path-header">
                  <span className="mono path-label">Experience</span>
                  <div className="path-badges">
                    <span className="badge-pill mono">15+ Services</span>
                    <span className="badge-pill mono">50% Speedup</span>
                  </div>
                </div>
                <strong>Goldman Sachs</strong>
                <p>23 months building, scaling, and maintaining mission-critical engineering pipelines and trading workflows.</p>
                <div className="path-footer mono">
                  <span>Explore professional proof</span>
                  <ArrowUpRight className="path-arrow" aria-hidden="true" />
                </div>
              </Link>
            </Reveal>
            <Reveal delay={140}>
              <Link to="/lab" className="path-card path-card--lab spot">
                <div className="path-header">
                  <span className="mono path-label">The Lab</span>
                  <div className="path-badges">
                    <span className="badge-pill mono">Interactive</span>
                    <span className="badge-pill mono">Open Source</span>
                  </div>
                </div>
                <strong>Ideas <ArrowRight className="inline-icon" aria-hidden="true" /><span className="sr-only">to</span> experiments</strong>
                <p>Volatility surface modeling, distributed feeds, deep reinforcement learning, and procedural mathematics.</p>
                <div className="path-footer mono">
                  {completed.length > 0 ? (
                    <span className="path-count">{completed.length} completed showcases</span>
                  ) : (
                    <span>Browse showcases & research</span>
                  )}
                  <ArrowUpRight className="path-arrow" aria-hidden="true" />
                </div>
              </Link>
            </Reveal>
          </div>
        </section>

        {/* Digital Ecosystem Features: 3-column micro bento */}
        <section className="ecosystem">
          <Reveal>
            <SectionHeading title="The Digital Ecosystem" note="Built with modern web standards, procedural mathematics, and zero third-party tracking." />
          </Reveal>
          <div className="ecosystem-grid">
            <Reveal delay={50} className="eco-card spot">
              <div className="eco-icon"><Cpu /></div>
              <h3>Procedural 3D World</h3>
              <p>Dynamic branching Catmull-Rom cherry tree with wind physics, blooming rosettes, and tumbling petals powered by Three.js.</p>
              <span className="mono eco-tag">WebGL · 60 FPS</span>
            </Reveal>
            <Reveal delay={120} className="eco-card spot">
              <div className="eco-icon"><Waveform /></div>
              <h3>Harmonic Ambiance</h3>
              <p>Synthesized pentatonic wind chimes generated via the Web Audio API with zero external audio assets or latency.</p>
              <span className="mono eco-tag">Web Audio · Pentatonic</span>
            </Reveal>
            <Reveal delay={190} className="eco-card spot">
              <div className="eco-icon"><Compass /></div>
              <h3>System Navigation</h3>
              <p>Keyboard-driven Spotlight Command Palette (⌘K) with instant fuzzy search across all career notes, code, and tools.</p>
              <span className="mono eco-tag">Command Palette · ⌘K</span>
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
