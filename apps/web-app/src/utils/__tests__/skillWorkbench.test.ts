import { describe, expect, it } from 'vitest';
import canonicalCatalog from '../../../../../skills_index.json';
import { createMockSkill } from '../../factories/skill';
import {
  buildInstallerCommand,
  collectSelectionEvidence,
  matchesWorkbenchFilters,
  parseSelectedIds,
  type WorkbenchFilters,
} from '../skillWorkbench';

const baseFilters: WorkbenchFilters = {
  search: '',
  category: 'all',
  risk: 'all',
  provenance: 'all',
  compatibility: 'all',
  setup: 'all',
};

describe('skill workbench domain', () => {
  it('searches every recorded field promised by the workbench', () => {
    const skill = createMockSkill({
      id: 'service-audit',
      name: 'Service Audit',
      description: 'Reviews Kubernetes deployment supply chains.',
      category: 'security',
      tags: ['kubernetes', 'supply-chain'],
      source: 'community',
      source_type: 'community',
      source_repo: 'example/security-skills',
    });

    for (const query of [
      'service-audit',
      'Service Audit',
      'deployment supply',
      'security',
      'supply-chain',
      'community',
      'example/security',
    ]) {
      expect(matchesWorkbenchFilters(skill, { ...baseFilters, search: query }, 'codex')).toBe(true);
    }
    expect(matchesWorkbenchFilters(skill, { ...baseFilters, search: 'browser-design' }, 'codex')).toBe(false);
  });

  it('filters category and recorded-or-unknown risk without inventing defaults', () => {
    const skill = createMockSkill({
      category: 'operations',
      risk: undefined,
    });

    expect(matchesWorkbenchFilters(skill, {
      ...baseFilters,
      category: 'operations',
      risk: 'unknown',
    }, 'codex')).toBe(true);
    expect(matchesWorkbenchFilters(skill, { ...baseFilters, category: 'security' }, 'codex')).toBe(false);
    expect(matchesWorkbenchFilters(skill, { ...baseFilters, risk: 'safe' }, 'codex')).toBe(false);
  });

  it('filters raw unknown provenance and recorded host compatibility independently', () => {
    const skill = createMockSkill({
      source: 'https://example.com/source',
      source_type: undefined,
      plugin: {
        targets: { codex: 'blocked', claude: 'supported' },
        setup: { type: 'manual', summary: 'Configure a token.', docs: 'SKILL.md' },
        reasons: ['Codex-only tool is unavailable.'],
      },
    });

    expect(matchesWorkbenchFilters(skill, {
      ...baseFilters,
      provenance: 'unknown',
      compatibility: 'blocked',
      setup: 'manual',
    }, 'codex')).toBe(true);
    expect(matchesWorkbenchFilters(skill, { ...baseFilters, compatibility: 'blocked' }, 'claude')).toBe(false);
    expect(matchesWorkbenchFilters(skill, { ...baseFilters, compatibility: 'unrecorded' }, 'cursor')).toBe(true);

    const unrecorded = createMockSkill({ source: 'personal', source_type: undefined, plugin: undefined });
    expect(matchesWorkbenchFilters(unrecorded, {
      ...baseFilters,
      provenance: 'unknown',
      compatibility: 'unrecorded',
      setup: 'unknown',
    }, 'codex')).toBe(true);
  });

  it('keeps evidence dimensions separate instead of manufacturing a score', () => {
    const skills = [
      createMockSkill({
        id: 'unknown-source',
        risk: 'unknown',
        source: 'external',
        source_type: undefined,
      }),
      createMockSkill({
        id: 'blocked-offensive',
        risk: 'offensive',
        source_type: 'community',
        plugin: {
          targets: { codex: 'blocked', claude: 'supported' },
          setup: { type: 'manual', summary: 'Manual setup', docs: null },
          reasons: ['Blocked'],
        },
      }),
    ];

    const evidence = collectSelectionEvidence(skills, 'codex');
    expect(evidence.unknownRisk.map((skill) => skill.id)).toEqual(['unknown-source']);
    expect(evidence.missingProvenance.map((skill) => skill.id)).toEqual(['unknown-source']);
    expect(evidence.elevatedRisk.map((skill) => skill.id)).toEqual(['blocked-offensive']);
    expect(evidence.blockedForHost.map((skill) => skill.id)).toEqual(['blocked-offensive']);
    expect(evidence.manualSetup.map((skill) => skill.id)).toEqual(['blocked-offensive']);
  });

  it('round-trips a deterministic exact selection and pins package and source release', () => {
    expect(parseSelectedIds('zeta,alpha,zeta')).toEqual(['alpha', 'zeta']);
    expect(buildInstallerCommand({
      skillIds: ['zeta', 'alpha'],
      host: 'codex',
      version: '14.2.0',
      dryRun: true,
    })).toBe(
      'npx agentic-awesome-skills@14.2.0 --codex --release 14.2.0 --skills alpha,zeta --dry-run',
    );
  });

  it('refuses malformed IDs instead of shell-quoting untrusted selection state', () => {
    expect(() => buildInstallerCommand({
      skillIds: ['safe-skill', 'bad;command'],
      host: 'claude',
      version: '14.2.0',
      dryRun: false,
    })).toThrow(/Invalid skill IDs/i);
  });

  it('accepts the legacy underscore used by a canonical catalog id', () => {
    expect(buildInstallerCommand({
      skillIds: ['android_ui_verification'],
      host: 'codex',
      version: '14.2.0',
      dryRun: true,
    })).toContain('--skills android_ui_verification --dry-run');
  });

  it('proves every current canonical catalog id is unique and command-safe', () => {
    const ids = canonicalCatalog.map((skill) => skill.id);

    expect(ids.length).toBeGreaterThan(1_000);
    expect(new Set(ids).size).toBe(ids.length);
    expect(parseSelectedIds(ids.join(','))).toEqual([...ids].sort());
    expect(() => buildInstallerCommand({
      skillIds: ids,
      host: 'codex',
      version: '14.2.0',
      dryRun: true,
    })).not.toThrow();
  });
});
