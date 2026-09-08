import { catalogVersion } from './catalogRelease';

export type BriefTarget = 'codex:project' | 'claude:project';

export function buildShortlistBrief(ids: string[], goal: string, target: BriefTarget): string {
  return `Help me prepare an AAS Core skill stack for this project.

Desired outcome:
${goal.trim()}

Target: ${target}
I shortlisted these exact IDs in catalog v${catalogVersion}:
${ids.map((id) => `- ${id}`).join('\n')}

Treat this shortlist as candidates to inspect, not a complete or approved stack.
Inspect the repository and identify its capability areas. Search and read the complete local AAS catalog; compare candidates, including these IDs, against the goal and constraints. Explain any additions, omissions, redundancy, manual setup, and catalog gaps. Plugin packaging and risk metadata are informational, not eligibility rules.
Confirm the local catalog version and report any difference from v${catalogVersion}; do not silently substitute missing IDs. Choose the exact skill IDs yourself, then use compose_stack and inspect_stack to return a validated schema 2 manifest with the project profile and target. Review it with me before persisting aas-stack.json.
After that review, validate the manifest and generate an immutable plan with the CLI using explicit paths and integrity inputs. Write only the requested artifacts. I will import aas-stack.json and the plan into Workbench to review them. Do not install or apply skills.`;
}
