import { describe, expect, it } from 'vitest';
import { filterWorkflows, workflowSkillIds, workflows } from '../workflows';

describe('workflow catalog adapter', () => {
  it('loads the curated machine-readable workflows and resolves unique skill IDs in phase order', () => {
    expect(workflows).toHaveLength(5);
    const workflow = workflows.find((item) => item.id === 'ship-saas-mvp');
    expect(workflow).toBeDefined();
    expect(workflowSkillIds(workflow!)).toEqual([
      'brainstorming', 'concise-planning', 'writing-plans',
      'backend-dev-guidelines', 'api-patterns', 'database-design', 'auth-implementation-patterns',
      'frontend-developer', 'react-patterns', 'frontend-design',
      'test-driven-development', 'systematic-debugging', 'browser-automation', 'go-playwright',
      'deployment-procedures', 'observability-engineer', 'postmortem-writing',
    ]);
  });

  it('matches every search term across workflow name, phase goals, notes and skill IDs', () => {
    expect(filterWorkflows(workflows, 'security audit').map((item) => item.id)).toEqual(['security-audit-web-app']);
    expect(filterWorkflows(workflows, 'browser Go').map((item) => item.id)).toEqual(['ship-saas-mvp', 'qa-browser-automation']);
    expect(filterWorkflows(workflows, 'unknown goal')).toEqual([]);
    expect(filterWorkflows(workflows, '   ')).toHaveLength(workflows.length);
  });
});
