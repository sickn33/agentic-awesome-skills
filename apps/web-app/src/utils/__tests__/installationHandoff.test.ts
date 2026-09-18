import { describe, expect, it } from 'vitest';
import { buildInstallationPreview } from '../installationHandoff';

describe('installation preview text', () => {
  it('pins selection and release and always previews', () => {
    const result = buildInstallationPreview(['react', 'game-development/2d-games'], '16.8.0', '.agents/skills', 'posix');
    expect(result).toContain('--package=agentic-awesome-skills@16.8.0');
    expect(result).toContain('--release 16.8.0');
    expect(result).toContain("--skills 'react,game-development/2d-games'");
    expect(result).toMatch(/--dry-run$/);
  });
  it('quotes paths for each terminal without evaluating shell text', () => {
    const path = "/tmp/Nicco's $(touch nope) `oops`";
    expect(buildInstallationPreview(['react'], '16.8.0', path, 'posix')).toContain("--path '/tmp/Nicco'\\''s $(touch nope) `oops`'");
    expect(() => buildInstallationPreview(['react'], '16.8.0', path, 'powershell')).toThrow();
    expect(buildInstallationPreview(['react'], '16.8.0', "C:\\Users\\Nicco's Skills", 'powershell')).toContain("--path 'C:\\Users\\Nicco''s Skills'");
  });
  it('rejects substituted packages, unsafe inputs and ambiguous versions', () => {
    for (const version of ['latest', '16.8.0;echo', 'v16.8.0']) expect(() => buildInstallationPreview(['react'], version, '.agents/skills', 'posix')).toThrow();
    for (const ids of [[], ['../x'], ['x','x'], ['x;echo']]) expect(() => buildInstallationPreview(ids, '16.8.0', '.agents/skills', 'posix')).toThrow();
    for (const path of ['', '~/.codex/skills', '/tmp/a\nb']) expect(() => buildInstallationPreview(['react'], '16.8.0', path, 'posix')).toThrow();
    expect(() => buildInstallationPreview(['react'], '16.8.0', '.agents/skills', 'posix', 'other-package')).toThrow();
  });
});
