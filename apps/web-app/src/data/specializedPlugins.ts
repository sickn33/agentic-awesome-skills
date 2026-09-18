import candidateManifest from '../../../../data/specialized-plugin-candidates.json';
import bundleManifest from '../../../../data/editorial-bundles.json';

export interface SpecializedPlugin {
  id: string;
  name: string;
  audience: string;
  why: string;
  skills: string[];
  notFor: string[];
  defaultPrompts: string[];
}

// Use the same editorial definitions as the installable plugin generator.
// The candidate list selects membership; it does not duplicate the presentation.
export const specializedPlugins: SpecializedPlugin[] = candidateManifest.candidates.map((candidate) => {
  const bundle = bundleManifest.bundles.find((entry) => entry.id === candidate.id);
  if (!bundle) throw new Error(`Missing specialized plugin bundle: ${candidate.id}`);
  return {
    id: bundle.id,
    name: bundle.name,
    audience: bundle.audience,
    why: bundle.description,
    skills: bundle.skills.map((skill) => skill.id),
    notFor: bundle.notFor ?? [],
    defaultPrompts: bundle.defaultPrompts ?? [],
  };
});
