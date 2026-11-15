const FAQ_ITEMS = [
  {
    question: 'What is Agentic Awesome Skills?',
    answer: (countLabel) =>
      `Agentic Awesome Skills is a library of ${countLabel} reusable SKILL.md playbooks for AI coding agents. AAS Core provides local catalog discovery, records the skills your agent chooses, validates the selection and previews a plan.`,
  },
  {
    question: 'How do I use AAS Core preview?',
    answer:
      'Configure the local stdio MCP with the AAS CLI, let the agent search and inspect the complete catalog, choose exact skill IDs itself, then validate the schema 2 aas-stack.json with its project profile and preview the immutable plan in the CLI. Apply and recovery are outside the non-applying preview path.',
  },
  {
    question: 'Is Agentic Awesome Skills a GitHub repository?',
    answer:
      'Yes. The GitHub repository at https://github.com/sickn33/agentic-awesome-skills is the canonical source for AAS Core, its CLI and local MCP, the skill catalog, plugins, and documentation. The hosted site is a companion catalog and local artifact-review surface.',
  },
  {
    question: 'What are AAS specialized plugins?',
    answer:
      'AAS specialized plugins are focused, domain-specific distributions of the skill library. They package relevant skills for web apps, security, data analytics, documents, DevOps, QA, OSS maintenance, and agent or MCP work so users can start with the right surface instead of activating the entire catalog.',
  },
  {
    question: 'What is the difference between skills and MCP tools?',
    answer:
      'Skills are reusable playbooks that tell an AI assistant how to execute a workflow. MCP tools expose external systems or callable actions. Skills guide behavior, context, constraints, and output quality; MCP tools provide the external capabilities an assistant may need while following those instructions.',
  },
  {
    question: 'How are plugins, bundles, and workflows different?',
    answer:
      'Plugins are installable packaging surfaces, bundles are curated skill recommendations, and workflows are ordered execution playbooks. Start with a plugin when the domain is clear, use bundles to compare adjacent skills, and use workflows when sequencing planning, coding, testing, auditing, or release work matters.',
  },
];

export function buildFaqItems(countLabel) {
  return FAQ_ITEMS.map((item) => ({ question: item.question, answer: typeof item.answer === 'function' ? item.answer(countLabel) : item.answer }));
}
