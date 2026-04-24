import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Link, Route, Routes } from 'react-router-dom';
import { Icon } from './components/ui/Icon';

const Home = lazy(() => import('./pages/Home'));
const SkillDetail = lazy(() => import('./pages/SkillDetail'));

function App(): React.ReactElement {
  const logoSrc = `${import.meta.env.BASE_URL}Antigravity-Skills-logo.png`;

  return (
    <Router basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <div className="app-shell min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]">
        <header className="sticky top-0 z-50 border-b border-[var(--stroke-subtle)] bg-[var(--surface-card)]">
          <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-4 lg:px-6">
            <Link to="/" className="group inline-flex items-center gap-3 rounded-[var(--radius-sm)] px-1 py-1">
              <img
                src={logoSrc}
                alt="Antigravity Skills logo"
                className="h-9 w-auto object-contain transition-transform duration-[var(--motion-fast)] ease-[var(--motion-ease)] group-hover:scale-[1.015]"
              />
              <span className="hidden text-sm font-semibold tracking-[0.01em] text-[var(--text-primary)] sm:inline-block">
                Antigravity Skills
              </span>
            </Link>

            <nav className="flex items-center">
              <a
                href="https://github.com/sickn33/antigravity-awesome-skills"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--stroke-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] shadow-[var(--shadow-soft)] transition-all duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:border-[var(--accent-border)] hover:text-[var(--text-primary)] hover:shadow-[var(--shadow-medium)]"
              >
                <Icon name="github" size={18} weight="duotone" className="opacity-85" />
                GitHub Repository
              </a>
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-screen-2xl px-4 py-6 md:py-8 lg:px-6">
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--stroke-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-soft)]">
            <Suspense
              fallback={
                <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--text-muted)]">
                  Loading...
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/skill/:id" element={<SkillDetail />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
