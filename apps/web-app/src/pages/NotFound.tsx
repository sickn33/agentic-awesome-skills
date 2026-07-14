import { Link, useLocation } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

export default function NotFound(): React.ReactElement {
  const location = useLocation();

  usePageMeta({
    title: 'Page not found | Agentic Awesome Skills',
    description: 'The requested catalog page does not exist.',
    canonicalPath: location.pathname,
    robots: 'noindex, follow',
  });

  return (
    <section className="not-found-page">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">404</p>
      <h1 className="text-3xl font-bold text-[var(--text-primary)]">Page not found</h1>
      <p className="text-[var(--text-secondary)]">The requested catalog page does not exist or has moved.</p>
      <Link to="/" className="rounded-[var(--radius-sm)] bg-[var(--accent-solid)] px-4 py-2 font-medium text-white">
        Browse skills
      </Link>
    </section>
  );
}
