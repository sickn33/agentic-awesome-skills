import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { getSeoLandingPage, seoLandingPages } from '../data/seoLandingPages';
import { usePageMeta } from '../hooks/usePageMeta';
import { buildTopicLandingFallbackMeta, buildTopicLandingMeta } from '../utils/seo';

export function TopicLanding(): React.ReactElement {
  const { slug } = useParams<{ slug: string }>();
  const page = getSeoLandingPage(slug);

  usePageMeta(page ? buildTopicLandingMeta(page) : buildTopicLandingFallbackMeta(slug));

  if (!page) {
    return (
      <div className="px-6 py-14 text-center sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Topic guide
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-normal text-slate-900 dark:text-slate-100">
          Topic guide not found
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          This catalog guide is not available. Browse the current topic pages or return to the full skills catalog.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Browse all skills
          </Link>
          {seoLandingPages.slice(0, 2).map((landing) => (
            <Link
              key={landing.slug}
              to={`/topics/${landing.slug}`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {landing.eyebrow}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <article className="space-y-10 px-6 py-8 sm:px-8 lg:px-10">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {page.eyebrow}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-normal text-slate-900 sm:text-5xl sm:leading-tight dark:text-slate-100">
            {page.h1}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {page.summary}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {page.primaryIntent}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {page.links.map((link) => link.to ? (
              <Link
                key={`${link.label}-${link.to}`}
                to={link.to}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={`${link.label}-${link.href}`}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
          <h2 className="text-base font-semibold tracking-normal text-slate-900 dark:text-slate-100">
            Search intent covered
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {page.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {keyword}
              </span>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {page.sections.map((section) => (
          <article
            key={section.heading}
            className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950"
          >
            <h2 className="text-base font-semibold tracking-normal text-slate-900 dark:text-slate-100">
              {section.heading}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {section.body}
            </p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-slate-900 dark:text-slate-100">
              Continue exploring the catalog
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              The topic pages are entry points. The full catalog and plugin index remain the fastest way to compare the live skill library.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Icon name="search" size={16} className="h-4 w-4" />
            Search all skills
          </Link>
        </div>
      </section>
    </article>
  );
}

export default TopicLanding;
