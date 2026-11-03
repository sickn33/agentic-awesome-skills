import { Link } from 'react-router';
import { Heart } from '@phosphor-icons/react';
import pages from '../data/informationPages.json';
const sponsors = pages.find(page=>page.path==='/sponsors/')!;
const identities = [['Codex','openai.svg'],['Vercel','vercel-mark.svg'],['Snyk','snyk-mark.svg'],['Atlas Cloud','atlas-mark.svg'],['BrowserStack','browserstack-mark.svg']];
export function HomeSupporters() {
  return <section className="home-supporters" aria-label="Support AAS"><div className="brand-wrap">
    <div className="supporter-invitation"><div><h2>Support AAS<span>.</span></h2><p>Fund maintenance, skill reviews and releases.</p></div><div className="action-row"><a className="support-cta support-sponsor" href="https://github.com/sponsors/sickn33"><Heart size={28} aria-hidden="true"/><span><strong>Sponsor AAS</strong><small>GitHub Sponsors</small></span></a><a className="support-cta support-coffee" href="https://buymeacoffee.com/sickn33"><img src={`${import.meta.env.BASE_URL}sponsors/buy-me-a-coffee.svg`} width="28" height="40" alt=""/><span><strong>Buy me a coffee</strong><small>Support Nick</small></span></a></div></div>
    <div className="supporters-label"><span>Infrastructure & tooling supporters</span><Link to="/sponsors/">Meet the supporters</Link></div><div className="home-supporter-logos">{identities.map(([name,file],index)=><a key={name} href={sponsors.sections[index+2].links[0].href} aria-label={sponsors.sections[index+2].title}><img src={`${import.meta.env.BASE_URL}sponsors/${file}`} alt="" width="36" height="36"/><span>{name}</span></a>)}</div><p className="supporter-note">In-kind support: tools, access and credits.</p>
  </div></section>;
}
