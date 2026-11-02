import { Link } from 'react-router';
import { useSkills } from '../context/SkillContext';
import { usePageMeta } from '../hooks/usePageMeta';

export default function SkillDirectory(): React.ReactElement {
  const { skills, loading, error } = useSkills();
  usePageMeta({ title: 'All skills A–Z | Agentic Awesome Skills', description: 'Browse the complete alphabetical directory of reusable AI agent skills.', canonicalPath: '/directory', jsonLd: [] });
  return <section className="skill-directory-page">
    <h1>All skills A–Z</h1>
    <p>Browse the complete alphabetical directory of reusable AI agent skills.</p>
    <Link to="/core/">Search and filter the catalog</Link>
    {loading ? <p role="status">Loading skills…</p> : error ? <p role="alert">{error}</p> : <ul className="skill-directory">{[...skills].sort((a, b) => a.id.localeCompare(b.id, 'en')).map((skill) => <li key={skill.id}><Link to={`/skill/${encodeURIComponent(skill.id)}/`}>{skill.id}</Link></li>)}</ul>}
  </section>;
}
