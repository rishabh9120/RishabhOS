import { LockKey } from '@phosphor-icons/react';
import Page from '../components/Page.jsx';

/* Placeholder shell for personal tools. The finance calculator lives in a
   separate repo and will be integrated here later (mount it at this route).
   NOTE: there is no authentication yet. Put /private behind Cloudflare Access
   before adding anything sensitive (see README). */
export default function Private() {
  return (
    <Page>
      <div className="container">
        <section className="page-hero">
          <span className="eyebrow mono rise">Private</span>
          <h1 className="page-title rise" style={{ '--d': '80ms' }}>A private branch <em>for later.</em></h1>
          <p className="rise" style={{ '--d': '180ms' }}>This is the shell for personal tools such as Finance.</p>
          <div className="private-panel rise" style={{ '--d': '280ms' }}>
            <LockKey className="private-icon" aria-hidden="true" />
            <strong>Finance</strong>
            <p>A personal finance calculator will live here. It is not connected yet.</p>
          </div>
        </section>
      </div>
    </Page>
  );
}
