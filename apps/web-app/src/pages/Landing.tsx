import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../components/ui/Icon';
import { usePageMeta } from '../hooks/usePageMeta';
import { catalogVersion } from '../utils/catalogRelease';
import { buildLandingMeta, toIndexableRoutePath } from '../utils/seo';
import './Landing.css';

const INSTALL_COMMAND = 'npx agentic-awesome-skills';
const REPO_URL = 'https://github.com/sickn33/agentic-awesome-skills';
const DOCS_ROOT = `${REPO_URL}/blob/main/docs/users`;
const CORE_GUIDE_URL = `${DOCS_ROOT}/aas-core.md`;
const CATALOG_SIZE_LABEL = '2,000+';

const agents = [
  { name: 'Codex', flag: '--codex', href: `${DOCS_ROOT}/codex-cli-skills.md` },
  { name: 'Claude Code', flag: 'MCP', href: `${DOCS_ROOT}/claude-code-skills.md` },
  { name: 'Cursor', flag: '--cursor', href: `${DOCS_ROOT}/cursor-skills.md` },
  { name: 'Gemini CLI', flag: '--gemini', href: `${DOCS_ROOT}/gemini-cli-skills.md` },
  { name: 'Antigravity', flag: '--antigravity', href: `${REPO_URL}#choose-your-tool` },
  { name: 'Kiro', flag: '--kiro', href: `${REPO_URL}#choose-your-tool` },
  { name: 'OpenCode', flag: '--path', href: `${REPO_URL}#choose-your-tool` },
  { name: 'Any tool', flag: '--path ./dir', href: `${REPO_URL}#choose-your-tool` },
] as const;

const steps = [
  {
    id: '01',
    title: 'Search',
    body: 'The agent queries the full catalog through local MCP or the hosted Core UI. Every skill ships with evidence, risk, and source.',
  },
  {
    id: '02',
    title: 'Choose',
    body: 'The agent, not a heuristic, selects exact skill IDs and writes a reviewable aas-stack.json with its project profile.',
  },
  {
    id: '03',
    title: 'Validate',
    body: 'The CLI checks the stack against the schema and catalog. Nothing is written to your project yet.',
  },
  {
    id: '04',
    title: 'Preview',
    body: 'An immutable plan shows exactly what would land where. Apply only when you agree.',
  },
] as const;

export function Landing(): React.ReactElement {
  const wordmarkSrc = `${import.meta.env.BASE_URL}aas-wordmark-hero.png`;
  const avatarSrc = `${import.meta.env.BASE_URL}maintainer-avatar.jpg`;
  const [copied, setCopied] = useState(false);

  usePageMeta(buildLandingMeta());

  const copyInstall = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, []);

  return (
    <div className="landing-page">
      {/* Hero: brand-first neon sign, then the pitch */}
      <section className="landing-hero" aria-labelledby="landing-hero-title">
        <div className="landing-sign" aria-hidden="true">
          <span className="landing-sign__trace landing-sign__trace--left" />
          <img src={wordmarkSrc} alt="" className="landing-sign__wordmark" width={749} height={295} />
          <span className="landing-sign__trace landing-sign__trace--right" />
        </div>

        <Link to={toIndexableRoutePath('/core')} className="landing-badge">
          <span className="landing-badge__dot" aria-hidden="true" />
          AAS Core preview · v{catalogVersion}
          <Icon name="arrowRight" size={14} />
        </Link>

        <h1 id="landing-hero-title" className="landing-hero__title">
          The open skill catalog for coding agents.
        </h1>
        <p className="landing-hero__punch">Search. Choose. Validate. Preview.</p>
        <p className="landing-hero__lede">
          {CATALOG_SIZE_LABEL} reusable <code>SKILL.md</code> playbooks for Codex, Claude Code, Cursor,
          Gemini CLI, and Antigravity. AAS Core lets the agent pick exact skills and preview the
          plan before anything touches your project.
        </p>

        <div className="landing-terminal">
          <span className="landing-terminal__prompt" aria-hidden="true">$</span>
          <code className="landing-terminal__cmd">{INSTALL_COMMAND}</code>
          <button
            type="button"
            className="landing-terminal__copy"
            onClick={() => void copyInstall()}
            aria-label={copied ? 'Copied' : 'Copy install command'}
          >
            <Icon name={copied ? 'check' : 'copy'} size={15} />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="landing-hero__actions">
          <Link to={toIndexableRoutePath('/core')} className="landing-cta landing-cta--primary">
            Enter Core
            <Icon name="arrowRight" size={16} />
          </Link>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="landing-cta landing-cta--ghost">
            <Icon name="github" size={16} weight="fill" />
            GitHub
          </a>
        </div>
      </section>

      {/* Agents: intro left, install-flag tiles right */}
      <section className="landing-section landing-agents" aria-labelledby="landing-agents-title">
        <div className="landing-section__intro">
          <p className="landing-kicker">Compatibility</p>
          <h2 id="landing-agents-title">Works with every agent.</h2>
          <p>
            One installer, one flag per tool. AAS plugs into anything that can load{' '}
            <code>SKILL.md</code> files.
          </p>
        </div>
        <ul className="landing-agents__grid">
          {agents.map((agent) => (
            <li key={agent.name}>
              <a href={agent.href} target="_blank" rel="noreferrer" className="landing-agent">
                <span className="landing-agent__name">{agent.name}</span>
                <code className="landing-agent__flag">{agent.flag}</code>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Surfaces: bento, Core dominant */}
      <section className="landing-section landing-surfaces" aria-labelledby="landing-surfaces-title">
        <div className="landing-section__intro">
          <p className="landing-kicker">Surfaces</p>
          <h2 id="landing-surfaces-title">Current surfaces.</h2>
          <p>Pick the right entry point for the job.</p>
        </div>

        <div className="landing-bento">
          <Link to={toIndexableRoutePath('/core')} className="landing-tile landing-tile--core">
            <span className="landing-tile__badge">Catalog</span>
            <span className="landing-tile__title">AAS Core</span>
            <span className="landing-tile__body">
              Search {CATALOG_SIZE_LABEL} skills by outcome, category, risk, and source. Shortlist
              in the browser, then hand exact IDs to your agent.
            </span>
            <span className="landing-tile__stats" aria-hidden="true">
              <span><strong>{CATALOG_SIZE_LABEL}</strong>skills</span>
              <span><strong>100+</strong>categories</span>
              <span><strong>v{catalogVersion}</strong>current release</span>
            </span>
            <span className="landing-tile__go">
              Enter Core <Icon name="arrowRight" size={16} />
            </span>
          </Link>

          <Link to={toIndexableRoutePath('/workbench')} className="landing-tile">
            <span className="landing-tile__badge">Review</span>
            <span className="landing-tile__title">Workbench</span>
            <span className="landing-tile__body">
              Import agent-produced stack manifests and immutable plans. Browser memory only, no
              filesystem writes.
            </span>
            <span className="landing-tile__go">
              Open Workbench <Icon name="arrowRight" size={16} />
            </span>
          </Link>

          <Link to={toIndexableRoutePath('/plugins')} className="landing-tile">
            <span className="landing-tile__badge">Packs</span>
            <span className="landing-tile__title">Plugins</span>
            <span className="landing-tile__body">
              Focused domain distributions when you already know the surface and do not want the
              whole library.
            </span>
            <span className="landing-tile__go">
              Compare plugins <Icon name="arrowRight" size={16} />
            </span>
          </Link>
        </div>
      </section>

      {/* How it works: four horizontal steps */}
      <section className="landing-section landing-steps" aria-labelledby="landing-steps-title">
        <div className="landing-section__intro landing-section__intro--wide">
          <p className="landing-kicker">How AAS Core works</p>
          <h2 id="landing-steps-title">From intent to a reviewable plan.</h2>
          <p>
            A local, agent-first boundary. Retrieval and validation are read-only; planning writes
            only the plan artifact. Apply and recovery stay outside the preview path.
          </p>
        </div>

        <ol className="landing-steps__list">
          {steps.map((step) => (
            <li key={step.id} className="landing-step">
              <span className="landing-step__id" aria-hidden="true">§ {step.id}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="landing-steps__cta">
          <a href={CORE_GUIDE_URL} target="_blank" rel="noreferrer" className="landing-cta landing-cta--ghost">
            <Icon name="book" size={16} />
            Read the Core guide
          </a>
          <Link to={toIndexableRoutePath('/workbench')} className="landing-cta landing-cta--ghost">
            Try the Workbench
            <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </section>

      {/* Closing strip */}
      <section className="landing-section landing-strip" aria-labelledby="landing-strip-title">
        <h2 id="landing-strip-title" className="sr-only">Project</h2>
        <a href="https://github.com/sickn33" target="_blank" rel="noreferrer" className="landing-strip__maintainer">
          <img src={avatarSrc} alt="" className="landing-strip__avatar" width={40} height={40} />
          <span>
            <span className="landing-strip__label">Maintained by</span>
            <span className="landing-strip__name">@sickn33</span>
          </span>
        </a>
        <p className="landing-strip__note">
          Open source, MIT. Send a skill, fix a doc, or open an issue: source PRs are welcome.
        </p>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="landing-cta landing-cta--ghost">
          <Icon name="star" size={16} />
          Star on GitHub
        </a>
      </section>
    </div>
  );
}

export default Landing;
