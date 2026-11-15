import { Link } from 'react-router';

export function CatalogNavigation({ active, onSelect }: { active: 'skills' | 'packs' | 'workflows' | 'collections'; onSelect?: (view: 'skills' | 'workflows' | 'collections') => void }): React.ReactElement {
  const entries = [
    { id: 'skills', label: 'Skills', href: '/core/' },
    { id: 'packs', label: 'Packs', href: '/plugins/' },
    { id: 'workflows', label: 'Workflows', href: '/core/?view=workflows' },
    { id: 'collections', label: 'My collections', href: '/core/?view=collections' },
  ] as const;
  return <nav className="catalog-views" aria-label="Catalog views">{entries.map((entry) => onSelect && entry.id !== 'packs' ? <button type="button" key={entry.id} aria-current={active === entry.id ? 'page' : undefined} onClick={() => onSelect(entry.id as 'skills' | 'workflows' | 'collections')}>{entry.label}</button> : <Link key={entry.id} to={entry.href} aria-current={active === entry.id ? 'page' : undefined}>{entry.label}</Link>)}<Link className="catalog-directory-link" to="/directory/">Browse all skills A–Z</Link></nav>;
}
