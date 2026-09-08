export type CommandShell = 'posix' | 'powershell';
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const ID = /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/;

/** Prepare text only. Never executes, downloads, or treats a Core plan as installer state. */
export function buildInstallationPreview(ids: string[], version: string, destination: string, shell: CommandShell, packageName = 'agentic-awesome-skills'): string {
  if (packageName !== 'agentic-awesome-skills' || !VERSION.test(version)) throw new Error('An exact AAS release version is required.');
  if (!ids.length || ids.length > 128 || ids.some((id) => !ID.test(id) || id.length > 200 || id.split('/').some((part) => part === '.' || part === '..')) || new Set(ids).size !== ids.length) throw new Error('Choose between 1 and 128 distinct skill IDs.');
  if (!destination.trim() || destination.length > 1000 || /^[~-]/.test(destination) || Array.from(destination).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new Error('Enter a skill directory using a full path or a project-relative path; expand ~ yourself.');
  if (shell === 'powershell' && /["&|<>^%!`$()]/.test(destination)) throw new Error('For npm.cmd, use a directory without shell metacharacters.');
  const quote = (value: string) => shell === 'powershell' ? `'${value.split("'").join( "''")}'` : `'${value.split("'").join( "'\\''")}'`;
  return `${shell === 'powershell' ? 'npm.cmd' : 'npm'} exec --yes --ignore-scripts --package=agentic-awesome-skills@${version} -- agentic-awesome-skills --release ${version} --path ${quote(destination)} --skills ${quote(ids.join(','))} --dry-run`;
}
