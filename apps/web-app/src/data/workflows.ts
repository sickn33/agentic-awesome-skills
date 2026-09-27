import manifest from '../../../../data/workflows.json';

export interface WorkflowStep {
  title: string;
  goal: string;
  recommendedSkills: string[];
  notes: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: string;
  relatedBundles: string[];
  steps: WorkflowStep[];
}

export const workflows: Workflow[] = manifest.workflows as Workflow[];

export function workflowSkillIds(workflow: Workflow): string[] {
  return [...new Set(workflow.steps.flatMap((step) => step.recommendedSkills))];
}

function workflowSearchText(workflow: Workflow): string {
  return [
    workflow.id,
    workflow.name,
    workflow.description,
    workflow.category,
    ...workflow.relatedBundles,
    ...workflow.steps.flatMap((step) => [step.title, step.goal, step.notes, ...step.recommendedSkills]),
  ].join(' ').toLowerCase();
}

export function filterWorkflows(catalog: Workflow[], query: string): Workflow[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return catalog;
  return catalog.filter((workflow) => {
    const text = workflowSearchText(workflow);
    return terms.every((term) => text.includes(term));
  });
}
