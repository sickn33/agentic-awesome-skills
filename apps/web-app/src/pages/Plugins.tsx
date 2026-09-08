import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../components/ui/Icon';
import { specializedPlugins, type SpecializedPlugin } from '../data/specializedPlugins';
import { usePageMeta } from '../hooks/usePageMeta';
import { buildPluginsMeta, toIndexableRoutePath } from '../utils/seo';
import { releaseFileUrl } from '../utils/catalogRelease';

const pluginFolderUrl = (pluginId: string) => releaseFileUrl(`plugins/agentic-bundle-${pluginId}`).replace('/blob/', '/tree/');
const pluginDocUrl = () => releaseFileUrl('docs/users/plugins.md');
const bundleDocUrl = () => releaseFileUrl('docs/users/bundles.md');
const gettingStartedDocUrl = () => releaseFileUrl('docs/users/getting-started.md');

export function Plugins(): React.ReactElement {
  const [query, setQuery] = useState('');
  usePageMeta(buildPluginsMeta(specializedPlugins.length));

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return specializedPlugins;
    return specializedPlugins.filter((plugin) => [plugin.name, plugin.id, plugin.audience, plugin.why, ...plugin.skills, ...plugin.defaultPrompts]
      .some((value) => value.toLowerCase().includes(normalized)));
  }, [query]);


  return (
    <div className="plugins-page">
      <header className="plugins-hero">
        <h1>Choose the focused AAS plugin for the job.</h1>
        <p>AAS specialized plugins are domain-specific distributions of the full skill library — smaller scope, clearer activation, faster starts.</p>
        <p>These bundles contain skill instructions. External tools, service accounts and connectors must be configured separately. Choose the skills relevant to your project; a bundle is not a requirement to use every included tool.</p>
        <div>
          <a href={pluginDocUrl()} target="_blank" rel="noreferrer">Read plugin install guide <Icon name="arrowRight" size={16} /></a>
          <Link to="/">Browse full skill catalog <Icon name="arrowRight" size={16} /></Link>
          <a href={gettingStartedDocUrl()} target="_blank" rel="noreferrer">Install one skill with GitHub CLI</a>
        </div>
      </header>

      <section className="plugin-decisions" aria-labelledby="plugin-decisions-title">
        <h2 id="plugin-decisions-title">Plugins, bundles, and workflows serve different decisions</h2>
        <div>
          <article><Icon name="book" size={22} /><div><h3>Plugin</h3><p>What should I install or activate for this domain?</p></div></article>
          <article><Icon name="fileCode" size={22} /><div><h3>Bundle</h3><p>Which skills naturally belong together for a role?</p></div></article>
          <article><Icon name="sort" size={22} /><div><h3>Workflow</h3><p>What order should the assistant follow to get a result?</p></div></article>
        </div>
      </section>

      <section className="plugin-catalog" aria-labelledby="plugin-catalog-title">
        <header>
          <div><h2 id="plugin-catalog-title">Focused distributions</h2><p role="status">{filtered.length} {filtered.length === 1 ? 'plugin' : 'plugins'}</p></div>
          <label>
            <Icon name="search" size={18} />
            <span className="sr-only">Filter plugins</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter plugins" aria-label="Filter plugins" />
          </label>
        </header>
        <PluginSection title="Specialized plugins" plugins={filtered} />
        {filtered.length === 0 && <p className="plugin-empty">No plugins match “{query}”.</p>}
      </section>
    </div>
  );
}

function PluginSection({ title, plugins }: { title: string; plugins: SpecializedPlugin[] }): React.ReactElement | null {
  if (plugins.length === 0) return null;
  return (
    <section className="plugin-tier">
      <h2>{title}</h2>
      <div className="plugin-table" role="table" aria-label={title}>
        <div className="plugin-table__head" role="row">
          <span role="columnheader">Plugin</span>
          <span role="columnheader">Audience</span>
          <span role="columnheader">Outcome and scope</span>
          <span role="columnheader">Included skills</span>
          <span role="columnheader">Actions</span>
        </div>
        {plugins.map((plugin) => <PluginRow key={plugin.id} plugin={plugin} />)}
      </div>
    </section>
  );
}

function PluginRow({ plugin }: { plugin: SpecializedPlugin }): React.ReactElement {
  return (
    <article className="plugin-row" id={plugin.id} role="row">
      <div role="cell" className="plugin-row__name">
        <span aria-hidden="true"><Icon name="fileCode" size={20} /></span>
        <div><h3>{plugin.name}</h3><code>{plugin.id}</code></div>
      </div>
      <p role="cell">{plugin.audience}</p>
      <div role="cell">
        <p>{plugin.why}</p>
        <details className="plugin-row__details">
          <summary>Scope and starting prompt</summary>
          <h4>Choose another option for</h4>
          <ul>{plugin.notFor.map((limit) => <li key={limit}>{limit}</li>)}</ul>
          <h4>Start with this brief</h4>
          <p>{plugin.defaultPrompts[0]}</p>
        </details>
      </div>
      <div role="cell" className="plugin-row__skills">
        {plugin.skills.slice(0, 4).map((skillId) => <Link key={skillId} to={toIndexableRoutePath(`/skill/${encodeURIComponent(skillId)}`)}>@{skillId}</Link>)}
        {plugin.skills.length > 4 && <details className="plugin-row__details">
          <summary>Show all {plugin.skills.length} skills</summary>
          <div className="plugin-row__skills">{plugin.skills.slice(4).map((skillId) => <Link key={skillId} to={toIndexableRoutePath(`/skill/${encodeURIComponent(skillId)}`)}>@{skillId}</Link>)}</div>
        </details>}
      </div>
      <div role="cell" className="plugin-row__actions">
        <a href={pluginFolderUrl(plugin.id)} target="_blank" rel="noreferrer">View plugin</a>
        <a href={bundleDocUrl()} target="_blank" rel="noreferrer">Bundle notes</a>
      </div>
    </article>
  );
}

export default Plugins;
