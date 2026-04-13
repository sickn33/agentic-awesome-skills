import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Github } from 'lucide-react';

const Home = lazy(() => import('./pages/Home'));
const SkillDetail = lazy(() => import('./pages/SkillDetail'));

function App(): React.ReactElement {
  const logoSrc = `${import.meta.env.BASE_URL}Antigravity-Skills-logo.png`;

  return (
    <Router basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="container flex h-14 max-w-screen-2xl items-center mx-auto px-4">
            <Link to="/" className="mr-8 flex items-center space-x-2">
              <img
                src={logoSrc}
                alt="Antigravity Skills logo"
                className="h-8 w-auto object-contain"
              />
              <span className="hidden font-bold sm:inline-block">Antigravity Skills</span>
            </Link>
            <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">

              <nav className="flex items-center space-x-6 text-sm font-medium">
                <a
                  href="https://github.com/sickn33/antigravity-awesome-skills"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"
                >
                  <Github className="h-5 w-5 mr-2" />
                  GitHub Repository
                </a>
              </nav>
            </div>
          </div>
        </header>
        <main className="container max-w-screen-2xl mx-auto px-4 py-6">
          <Suspense
            fallback={
              <div
                className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500 dark:text-slate-400"
              >
                Loading...
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/skill/:id" element={<SkillDetail />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;
