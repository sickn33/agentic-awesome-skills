import { useEffect } from 'react';
import pages from '../data/informationPages.json';
import { usePageMeta } from '../hooks/usePageMeta';
import './Sponsors.css';

const page = pages.find((entry) => entry.path === '/sponsors/')!;
const identities = [
  { id: 'codex', name: 'Codex', image: 'openai.svg', category: 'Coding & maintenance' },
  { id: 'vercel', name: 'Vercel', image: 'vercel-oss-2026.png', category: 'Web development' },
  { id: 'snyk', name: 'Snyk', image: 'snyk.svg', category: 'Security tooling' },
  { id: 'atlas-cloud', name: 'Atlas Cloud', image: 'atlas-cloud.svg', category: 'AI compute & model credits' },
  { id: 'browserstack', name: 'BrowserStack', image: 'browserstack.svg', category: 'Browser & device testing' },
];

export default function Sponsors(): React.ReactElement {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  usePageMeta({
    title: `${page.title} | Agentic Awesome Skills`,
    description: page.description,
    canonicalPath: page.path,
    robots: 'index, follow',
    jsonLd: (url) => [{ '@context': 'https://schema.org', '@type': 'WebPage', name: page.title, description: page.description, url }],
  });
  const support = page.sections[5];
  return <div className="sponsors-page">
    <header className="sponsors-intro">
      <h1>{page.intro}</h1>
      <div className="sponsors-intro__bottom">
        <p>{page.lede}</p>
        <a className="sponsors-action" href="#support-aas">Support AAS <span aria-hidden="true">↗</span></a>
      </div>
    </header>
    <section aria-labelledby="sponsors-heading">
      <div className="sponsors-section-heading">
        <h2 id="sponsors-heading">Our sponsors</h2>
        <p>Support through open-source programs</p>
      </div>
      <div className="sponsors-list">
        {identities.map((identity, index) => {
          const section = page.sections[index];
          return <article key={identity.id} className="sponsor" aria-labelledby={`sponsor-${identity.id}`}>
            <div className={`sponsor__identity sponsor__identity--${identity.id}`}>
              <img src={`${import.meta.env.BASE_URL}sponsors/${identity.image}`} alt={identity.id === 'vercel' ? 'Vercel Inc. 2026 Open Source Software Program' : identity.name} width={240} height={72} />
              {identity.id === 'codex' && <span aria-hidden="true">Codex</span>}
            </div>
            <div className="sponsor__description">
              <p className="sponsor__category">{identity.category}</p>
              <h3 id={`sponsor-${identity.id}`}>{section.title}</h3>
              <p>{section.body}</p>
              <a href={section.links[0].href}>{section.links[0].label} <span aria-hidden="true">↗</span></a>
            </div>
          </article>;
        })}
      </div>
    </section>
    <section id="support-aas" className="sponsors-support" aria-labelledby="sponsors-support-title">
      <h2 id="sponsors-support-title">{support.title}</h2>
      <div><p>{support.body}</p>
        <div className="sponsors-support__links">{support.links.map((link) => <a key={link.href} href={link.href}>{link.label} <span aria-hidden="true">↗</span></a>)}</div>
      </div>
    </section>
  </div>;
}
