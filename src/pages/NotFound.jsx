import { Link } from 'react-router-dom';
import { ArrowUpRight } from '@phosphor-icons/react';
import Page from '../components/Page.jsx';

export default function NotFound() {
  return (
    <Page>
      <div className="container">
        <section className="page-hero">
          <span className="eyebrow mono">404</span>
          <h1 className="page-title">Wrong branch.</h1>
          <p>Let's get you back to the trunk.</p>
          <Link to="/" className="button primary">Return home <ArrowUpRight aria-hidden="true" /></Link>
        </section>
      </div>
    </Page>
  );
}
