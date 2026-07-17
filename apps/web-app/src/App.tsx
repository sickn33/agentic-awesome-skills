import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Link, NavLink, Route, Routes } from 'react-router-dom';
import { Icon } from './components/ui/Icon';

const Home = lazy(() => import('./pages/Home'));
const SkillDetail = lazy(() => import('./pages/SkillDetail'));
const Workbench = lazy(() => import('./pages/Workbench'));
const Plugins = lazy(() => import('./pages/Plugins'));
const TopicLanding = lazy(() => import('./pages/TopicLanding'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CatalogRouteProvider = lazy(() => import('./context/CatalogRouteProvider'));

function App(): React.ReactElement {
  const logoSrc = `${import.meta.env.BASE_URL}agentic-skills-logo.png`;

  return (
    <Router basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <div className="app-shell min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
        <header className="app-header">
          <div className="app-header__inner">
            <Link to="/" className="brand-link" aria-label="Agentic Skills home">
              <img
                src={logoSrc}
                alt="Agentic Skills logo"
                className="brand-link__logo"
              />
              <span className="brand-link__name">
                Agentic Skills
              </span>
            </Link>

            <nav className="app-nav" aria-label="Primary navigation">
              <NavLink
                to="/"
                end
                className={({ isActive }) => `app-nav__link ${isActive ? 'is-active' : ''}`}
              >
                Explore
              </NavLink>
              <NavLink
                to="/workbench"
                className={({ isActive }) => `app-nav__link ${isActive ? 'is-active' : ''}`}
              >
                Workbench
              </NavLink>
              <NavLink
                to="/plugins"
                className={({ isActive }) => `app-nav__link ${isActive ? 'is-active' : ''}`}
              >
                Plugins
              </NavLink>
            </nav>

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
                  <Link to="/">Explore</Link>
                  <Link to="/workbench">Workbench</Link>
                  <Link to="/plugins">Plugins</Link>
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
              <Route element={<CatalogRouteProvider />}>
                <Route path="/" element={<Home />} />
                <Route path="/topics/:slug" element={<TopicLanding />} />
                <Route path="/skill/:id" element={<SkillDetail />} />
              </Route>
              <Route path="/plugins" element={<Plugins />} />
              <Route path="/workbench" element={<Workbench />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        <footer className="app-footer">
          <p>Independent, community-curated project. Review skills before use.</p>
          <nav aria-label="Footer navigation">
            <a href="https://github.com/sickn33/agentic-awesome-skills#contributing" target="_blank" rel="noreferrer">Contributing</a>
            <a href="https://github.com/sickn33/agentic-awesome-skills/blob/main/LICENSE" target="_blank" rel="noreferrer">License</a>
            <a href="https://github.com/sickn33/agentic-awesome-skills/blob/main/CODE_OF_CONDUCT.md" target="_blank" rel="noreferrer">Code of Conduct</a>
          </nav>
        </footer>
      </div>
    </Router>
  );
}

export default App;
