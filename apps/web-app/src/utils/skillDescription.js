// Keep the first useful information in snippets; do not prepend dates or boilerplate.
export function buildSkillDescription(skill) {
  const description = String(skill.description || '').replace(/\s+/gu, ' ').trim();
  const name = String(skill.name || skill.id || 'this skill').replace(/\s+/gu, ' ').trim() || 'this skill';
  const text = description || `Explore ${name}: reusable instructions for AI coding agents.`;
  const characters = Array.from(text);
  if (characters.length <= 160) return text;
  const prefix = characters.slice(0, 159).join('');
  const wordBoundary = prefix.lastIndexOf(' ');
  return `${(wordBoundary >= 80 ? prefix.slice(0, wordBoundary) : prefix).trimEnd()}…`;
}
