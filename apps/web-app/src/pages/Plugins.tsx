import { Link } from 'react-router-dom';
import { specializedPlugins } from '../data/specializedPlugins';
import { usePageMeta } from '../hooks/usePageMeta';
import { buildPluginsMeta } from '../utils/seo';

const repoBaseUrl = 'https://github.com/sickn33/antigravity-awesome-skills';

function pluginFolderUrl(pluginId: string): string {
  return `${repoBaseUrl}/tree/main/plugins/antigravity-bundle-${pluginId}`;
}

function pluginDocUrl(): string {
  return `${repoBaseUrl}/blob/main/docs/users/plugins.md`;
}

function bundleDocUrl(): string {
  return `${repoBaseUrl}/blob/main/docs/users/bundles.md`;
}

export function Plugins(): React.ReactElement {
  usePageMeta(buildPluginsMeta(specializedPlugins.length));

  const tierOne = specializedPlugins.filter((plugin) => plugin.priority === 'tier-1');
  const tierTwo = specializedPlugins.filter((plugin) => plugin.priority === 'tier-2');

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(circle_at_20%_12%,rgba(15,23,42,0.12),transparent_48%),radial-gradient(circle_at_84%_8%,rgba(99,102,241,0.16),transparent_54%)] dark:bg-[radial-gradient(circle_at_20%_12%,rgba(148,163,184,0.15),transparent_45%),radial-gradient(circle_at_84%_8%,rgba(129,140,248,0.2),transparent_52%)]" />

      <div className="space-y-8 p-5 sm:p-7">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_55px_-32px_rgba(15,23,42,0.55)] sm:p-8 dark:border-slate-800/80 dark:bg-slate-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            Specialized Plugins
          </p>
          <h1 className="max-w-[24ch] text-3xl font-bold tracking-tight text-slate-900 [text-wrap:balance] sm:text-[3.25rem] sm:leading-[0.97] dark:text-slate-100">
            Choose the focused AAS plugin for your AI coding workflow
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-300">
            AAS specialized plugins are focused, domain-specific distributions of the 1,541+ skill library.
            Start here when you know the job: web apps, security, data analytics, documents, DevOps, QA,
            OSS maintenance, mobile apps, automation, or agent and MCP systems.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={pluginDocUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Read plugin install guide
            </a>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-lg border border-slate-400/80 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_20px_-16px_rgba(15,23,42,0.7)] transition-colors hover:border-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Browse full skill catalog
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Quick Answer
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Plugins, bundles, and workflows serve different decisions
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Plugin</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                What should I install or activate for this domain?
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Bundle</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                Which skills naturally belong together for a role?
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Workflow</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                What order should the assistant follow to get a result?
              </p>
            </article>
          </div>
        </section>

        <PluginSection title="Tier 1 Plugins" plugins={tierOne} />
        <PluginSection title="Tier 2 Plugins" plugins={tierTwo} />
      </div>
    </div>
  );
}

function PluginSection({
  title,
  plugins,
}: {
  title: string;
  plugins: typeof specializedPlugins;
}): React.ReactElement {
  return (
    <section className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          AAS plugin catalog
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {plugins.map((plugin) => (
          <article
            key={plugin.id}
            id={plugin.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">{plugin.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{plugin.audience}</p>
              </div>
              <span className="w-fit rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {plugin.priority}
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{plugin.why}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {plugin.skills.slice(0, 6).map((skillId) => (
                <Link
                  key={skillId}
                  to={`/skill/${encodeURIComponent(skillId)}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-500"
                >
                  @{skillId}
                </Link>
              ))}
              {plugin.skills.length > 6 && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  +{plugin.skills.length - 6} more
                </span>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a
                href={pluginFolderUrl(plugin.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                View plugin folder
              </a>
              <a
                href={bundleDocUrl()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Read bundle notes
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default Plugins;
