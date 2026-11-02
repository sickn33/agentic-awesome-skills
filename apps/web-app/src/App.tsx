import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Link, Route, Routes, Navigate, useLocation } from 'react-router';
import { redactAnalyticsUrl } from './utils/analyticsPrivacy';
import { Analytics } from '@vercel/analytics/react';
import { Icon } from './components/ui/Icon';

const Sponsors = lazy(() => import('./pages/Sponsors'));
const InformationPage = lazy(() => import('./pages/InformationPage'));
const Landing = lazy(() => import('./pages/Landing'));
const SkillDirectory = lazy(() => import('./pages/SkillDirectory'));
const Home = lazy(() => import('./pages/Home'));
const SharedSelection = lazy(() => import('./pages/SharedSelection'));
const SkillDetail = lazy(() => import('./pages/SkillDetail'));
const Workbench = lazy(() => import('./pages/Workbench'));
const Plugins = lazy(() => import('./pages/Plugins'));
const Docs = lazy(() => import('./pages/Docs'));
const TopicLanding = lazy(() => import('./pages/TopicLanding'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CatalogRouteProvider = lazy(() => import('./context/CatalogRouteProvider'));

function CoreRedirect(): React.ReactElement {
  const { hash } = useLocation();
  const legacySections: Record<string, string> = {
    '#section-0': '/#recorded-example', '#section-1': '/docs/aas-core/#validate-and-preview-the-plan',
    '#section-2': '/docs/aas-core/#configure-the-local-mcp', '#section-3': '/#get-started',
    '#section-4': '/docs/aas-core/#use-the-reviewed-selection', '#section-5': '/trust/',
  };
  return <Navigate replace to={legacySections[hash] || '/'} />;
}

function PrimaryNavigation(): React.ReactElement {
  const { pathname } = useLocation();
  const entries = [
    { label: 'Catalog', href: '/core/', active: /^\/(core|directory|plugins|skill|share)(\/|$)/.test(pathname) },
    { label: 'Docs', href: '/docs/', active: /^\/(docs|workbench)(\/|$)/.test(pathname) },
    { label: 'Sponsors', href: '/sponsors/', active: pathname.startsWith('/sponsors') },
    { label: 'For teams', href: '/teams/', active: pathname.startsWith('/teams') },
  ];
  return <nav className="app-nav" aria-label="Primary navigation">{entries.map((entry) => <Link key={entry.href} to={entry.href} aria-current={entry.active ? 'page' : undefined} className={`app-nav__link ${entry.active ? 'is-active' : ''}`}>{entry.label}</Link>)}</nav>;
}

function App(): React.ReactElement {
  const logoSrc = `${import.meta.env.BASE_URL}aas-wordmark.png`;

  return (
    <Router basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <div className="app-shell min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
        <header className="app-header">
          <div className="app-header__inner">
            <Link to="/" className="brand-link" aria-label="AAS Core home">
              <img
                src={logoSrc}
                alt="AAS"
                className="brand-link__logo"
              />
              <span className="brand-link__name">
                Agentic Awesome Skills
              </span>
            </Link>

            <PrimaryNavigation />

            <div className="app-header__actions">
              <a
                href="https://github.com/sickn33/agentic-awesome-skills"
                target="_blank"
                rel="noreferrer"
                className="github-link"
              >
                <Icon name="github" size={19} weight="fill" />
                <span>View on GitHub</span>
              </a>

              <details className="mobile-nav">
                <summary aria-label="Open navigation">Menu</summary>
                <nav aria-label="Mobile navigation">
                  <Link to="/">AAS Core</Link>
                  <Link to="/core/">Catalog</Link>
                  <Link to="/docs/">Docs</Link>
                  <Link to="/teams/">For teams</Link>
                  <Link to="/sponsors/">Sponsors</Link>
                  <a href="https://github.com/sickn33/agentic-awesome-skills" target="_blank" rel="noreferrer">View on GitHub</a>
                </nav>
              </details>
            </div>
          </div>
        </header>

        <main className="app-main">
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-muted)]">
                Loading...
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route element={<CatalogRouteProvider />}>
                <Route path="/core" element={<Home />} />
                <Route path="/directory" element={<SkillDirectory />} />
                <Route path="/share" element={<SharedSelection />} />
                <Route path="/topics/:slug" element={<TopicLanding />} />
                <Route path="/skill/:id" element={<SkillDetail />} />
              </Route>
              <Route path="/aas-core" element={<CoreRedirect />} />
              <Route path="/teams" element={<InformationPage />} />
              <Route path="/sponsors" element={<Sponsors />} />
              <Route path="/trust" element={<InformationPage />} />
              <Route path="/plugins" element={<Plugins />} />
              <Route path="/plugins/aas-core" element={<InformationPage />} />
              <Route path="/plugins/aas-core/privacy" element={<InformationPage />} />
              <Route path="/plugins/aas-core/terms" element={<InformationPage />} />
              <Route path="/plugins/aas-core/support" element={<InformationPage />} />
              <Route path="/docs" element={<Docs />} />
              <Route path="/docs/:slug" element={<Docs />} />
              <Route path="/workbench" element={<Workbench />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        <footer className="app-footer">
          <p>Independent, community-curated project. Review skills before use.</p>
          <nav aria-label="Footer navigation">
            <Link to="/sponsors/">Sponsors</Link>
            <Link to="/trust/">Trust & transparency</Link>
            <a href="https://github.com/sickn33/agentic-awesome-skills/blob/main/PRIVACY.md">Privacy</a>
            <a href="https://github.com/sickn33/agentic-awesome-skills/blob/main/TERMS.md">Terms</a>
            <a href="https://github.com/sickn33/agentic-awesome-skills/blob/main/SECURITY.md">Security</a>
            <a href="https://github.com/sickn33/agentic-awesome-skills#contributing" target="_blank" rel="noreferrer">Project & contributions</a>
          </nav>
        </footer>
      </div>
      <Analytics beforeSend={(event) => ({ ...event, url: redactAnalyticsUrl(event.url) })} />
    </Router>
  );
}

export default App;
