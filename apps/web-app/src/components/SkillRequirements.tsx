import type { Skill } from '../types';
import { releaseFileUrl, skillSourcePath } from '../utils/catalogRelease';

export function SkillRequirements({ skill }: { skill: Skill }): React.ReactElement {
  const plugin = skill.plugin;
  const upstream = skill.source_repo && /^https?:\/\//i.test(skill.source_repo) ? skill.source_repo : null;
  const source = skillSourcePath(skill.path);
  const setupDocs = plugin?.setup.docs && source ? releaseFileUrl(plugin.setup.docs, source) : '';
  return (
    <dl className="skill-requirements">
      <div><dt>Declared risk</dt><dd>{skill.risk || 'unknown'}</dd></div>
      <div><dt>Setup</dt><dd>{plugin ? plugin.setup.type === 'manual' ? `Manual: ${plugin.setup.summary || 'Read the skill instructions.'}` : 'No extra setup declared' : 'Not recorded'}</dd></div>
      {setupDocs ? <div><dt>Setup guide</dt><dd><a href={setupDocs}>Read setup instructions</a></dd></div> : null}
      <div><dt>Plugin packaging</dt><dd>{plugin ? `Codex: ${plugin.targets.codex === 'supported' ? 'included' : 'not packaged'} · Claude: ${plugin.targets.claude === 'supported' ? 'included' : 'not packaged'}` : 'Not recorded'}</dd></div>
      {plugin?.reasons.length ? <div><dt>Packaging notes</dt><dd>{plugin.reasons.join('; ')}</dd></div> : null}
      <div><dt>Source</dt><dd>{upstream ? <a href={upstream}>{skill.source || 'Upstream repository'}</a> : skill.source || 'Not recorded'}</dd></div>
      <div><dt>License metadata</dt><dd>{skill.license || 'Not recorded in catalog'}</dd></div>
    </dl>
  );
}
