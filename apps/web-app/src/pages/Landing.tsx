import { Link, Navigate, useLocation } from 'react-router';
import { XLogo, GithubLogo, BookOpen } from '@phosphor-icons/react';
import AgentSetup from '../components/AgentSetup';
import { HomeSupporters } from '../components/HomeSupporters';
import './Landing.css';
import './LandingPolish.css';
import { WorkflowDemo } from '../components/WorkflowDemo';
import { buildLandingMeta } from '../utils/seo';
import { usePageMeta } from '../hooks/usePageMeta';

export function Landing() {
  const { hash } = useLocation();
  usePageMeta(buildLandingMeta(typeof __CATALOG_COUNT__ === 'number' ? __CATALOG_COUNT__ : 0));
  if (hash === '#recorded-example' || hash === '#get-started') {
    return <Navigate replace to={hash === '#recorded-example' ? '/aas-core/#recorded-example' : '/aas-core/#connect'} />;
  }
  return <div className="brand-home">
    <section className="brand-hero brand-wrap" aria-labelledby="hero-title">
      <div><h1 id="hero-title">Your agent.<br /><span className="hero-accent">The right skills.</span></h1><p>An open-source library of skills for coding agents.</p><div className="action-row"><Link className="brand-button" to="/docs/">Get started</Link><Link className="text-action" to="/plugins/">Browse packs</Link></div></div>
      <figure className="brand-video"><video controls playsInline preload="none" poster={`${import.meta.env.BASE_URL}videos/aas-introduction-v3-poster.jpg`} aria-label="AAS introduction video"><source src="https://aaskills.tech/videos/aas-introduction-v3.mp4" type="video/mp4" /><a href="https://aaskills.tech/videos/aas-introduction-v3.mp4">Watch the introduction</a></video><figcaption>AAS in 40 seconds</figcaption></figure>
    </section>
    <div className="brand-wrap"><AgentSetup /></div>
    <section className="home-story brand-wrap" aria-labelledby="method-title">
      <div className="home-section-head"><span className="home-eyebrow">What is AAS?</span><h2 id="method-title">Instructions.<br /><span>Ready to reuse.</span></h2><p>A skill is a file of instructions, with examples and resources. Your agent reads it to carry out a task.</p><Link className="text-action" to="/docs/getting-started/">How skills work</Link></div>
      <img className="skill-editorial-art" src={`${import.meta.env.BASE_URL}illustrations/aas-skill-manual.png`} alt="A reusable SKILL.md manual, with examples and resources, for Codex, Claude Code, Cursor, T3 Code and Antigravity." width="1200" height="1080" />
    </section>
    <section className="home-start brand-wrap" aria-labelledby="start-title"><WorkflowDemo /><div className="workflow-copy"><div className="home-section-head"><h2 id="start-title">Your agent.<br />Your workflow.</h2></div><ol className="start-steps"><li><span>01</span><h3>Choose skills</h3><p>Ask your agent through Core, or choose a pack.</p><Link to="/aas-core/">Explore Core</Link></li><li><span>02</span><h3>Add it to your agent</h3><p>Install the selected skills in your app.</p><Link to="/docs/">Setup guides</Link></li><li><span>03</span><h3>Give it a task</h3><p>Your agent follows the instructions. You review the result.</p><Link to="/docs/getting-started/">Usage guide</Link></li></ol></div></section>
    <section className="home-choice" aria-labelledby="choice-title"><div className="brand-wrap"><div className="home-section-head"><h2 id="choice-title">Start with your task</h2></div><div className="home-choice-options"><article><img className="choice-art" src={`${import.meta.env.BASE_URL}illustrations/aas-core.png`} alt="AAS Core: a reviewable selection with skill IDs, catalog version and project target." width="1100" height="760" loading="lazy" /><span className="home-eyebrow">AAS Core</span><h3>Ask your agent</h3><p>Your agent finds skills. Core validates the selection for you to review.</p><Link className="brand-button" to="/aas-core/">Discover Core</Link></article><article><img className="choice-art" src={`${import.meta.env.BASE_URL}illustrations/aas-packs.png`} alt="AAS Packs: related skill manuals grouped into one collection." width="1100" height="760" loading="lazy" /><span className="home-eyebrow">AAS Packs</span><h3>Install a collection</h3><p>Related skills, grouped by task and installed together.</p><Link className="text-action" to="/plugins/">Explore the packs</Link></article></div></div></section>
    <section className="home-open"><div className="brand-wrap"><h2>Open source.<br /><span>Yours to build on.</span></h2><div className="open-actions"><p>Explore the code. Make it yours.</p><div className="open-links"><a className="open-github" href="https://github.com/sickn33/agentic-awesome-skills"><GithubLogo size={32} weight="fill" aria-hidden="true"/><span><strong>View on GitHub</strong><small>sickn33 / agentic-awesome-skills</small></span></a><Link className="open-license" to="/trust/"><BookOpen size={22} aria-hidden="true"/><span>Sources & licenses</span></Link></div></div></div></section>
    <HomeSupporters />
    <section className="home-faq brand-wrap" aria-labelledby="faq-title">
      <header className="faq-heading"><h2 id="faq-title">Frequently asked questions</h2><Link className="text-action" to="/docs/">Read the guides</Link></header>
      <div className="faq-answers">
        <article><h3>What does AAS add to my agent?</h3><p>Reusable instructions for specific tasks, with examples and resources. Your agent reads them and applies them to your project.</p></article>
        <article><h3>Which agents can I use?</h3><p>Codex, Claude Code, Cursor and other agents that support skill files. The setup guides cover each supported app.</p></article>
        <article><h3>Do I need the whole library?</h3><p>No. Install a few skills or a pack. Core can help your agent find the relevant ones.</p></article>
        <article><h3>Can I change the instructions?</h3><p>Yes. Skills are readable files. Adapt them to your project while respecting their licenses and attribution.</p></article>
      </div>
    </section>
    <section className="brand-wrap founder-strip" aria-label="Project"><a href="https://github.com/sickn33" className="founder-profile"><img src={`${import.meta.env.BASE_URL}maintainer-avatar.jpg`} alt="sickn33" width="64" height="64" /><span><span>Maintained by</span><strong>@sickn33</strong></span></a><nav className="founder-links" aria-label="AAS and Nick on X"><a className="founder-social" href="https://x.com/AASkills_" target="_blank" rel="noopener noreferrer" aria-label="Follow AAS on X, @AASkills_"><XLogo size={28} aria-hidden="true"/><span><strong>Follow AAS</strong><small>@AASkills_</small></span></a><a className="founder-social" href="https://x.com/sickn33" target="_blank" rel="noopener noreferrer" aria-label="Follow Nick on X, @sickn33"><XLogo size={28} aria-hidden="true"/><span><strong>Follow Nick</strong><small>@sickn33</small></span></a><Link className="founder-about" to="/contribute/">Contribute to AAS</Link></nav></section>
  </div>;
}
export default Landing;
