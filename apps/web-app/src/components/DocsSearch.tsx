import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { loadSearchCorpus, searchGuides } from '../utils/docsContent';

export function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query.trim().split(/\s+/).filter(Boolean).map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!terms.length) return text;
  return text.split(new RegExp(`(${terms.join('|')})`, 'gi')).map((part, index) =>
    index % 2 ? <mark key={index}>{part}</mark> : <Fragment key={index}>{part}</Fragment>);
}

export default function DocsSearch({ query, onNavigate }: { query: string; onNavigate: () => void }) {
  const [corpus, setCorpus] = useState<Awaited<ReturnType<typeof loadSearchCorpus>>>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    loadSearchCorpus().then((result) => { if (!cancelled) setCorpus(result); }, () => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [attempt]);
  if (error) return <div role="status">Search could not load. <button type="button" onClick={() => { setError(false); setAttempt(attempt + 1); }}>Retry search</button></div>;
  if (!corpus) return <p role="status">Loading full text search…</p>;
  const results = searchGuides(corpus, query);
  return <section className="docs-search-results" aria-label="Search results">
    <p role="status">{results.length ? `${results.length} guides found.` : 'No guides found. Try a shorter phrase or a different term.'}</p>
    {results.map((doc) => <Link key={doc.slug} to={`/docs/${doc.slug}/`} aria-label={doc.title} onClick={onNavigate}>
      <strong><Highlight text={doc.title} query={query} /></strong>
      <span>{doc.group}</span>
      <p><Highlight text={doc.snippet} query={query} /></p>
    </Link>)}
  </section>;
}
