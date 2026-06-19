// Bot Protection evidence is usually account-level summary data. Avoid turning
// observed bot traffic into unsupported statements about exact WAF rule state.

export const metadata = {
  id: 'bot-protection-certainty',
  description: 'Soften unsupported Bot Protection / WAF certainty and require a staged rollout caveat.',
};

const STRING_FIELDS = ['what', 'why', 'fix', 'currentBehavior', 'desiredBehavior', 'verify'];

export function apply(rec) {
  if (!String(rec?.candidateRef ?? '').startsWith('platform_bot_protection:')) return {};
  const tags = [];
  for (const field of STRING_FIELDS) {
    if (typeof rec?.[field] !== 'string') continue;
    const before = rec[field];
    let after = before
      .replace(/\bno\s+(?:firewall\s+)?bot_filter\s+rule\b/gi, 'the collected firewall summary did not show an enforced bot-filter rule')
      .replace(/\b(?:bots?|bot traffic)\s+(?:is|are)\s+the\s+cause\b/gi, 'bot traffic is a likely contributor')
      .replace(/\bwithout\s+false[- ]positive\s+risk\b/gi, 'with false-positive risk monitored during rollout')
      .replace(/\bno\s+false[- ]positive\s+risk\b/gi, 'false-positive risk still needs rollout monitoring');
    if (after !== before) {
      rec[field] = after;
      tags.push(`bot-protection-certainty:${field}`);
    }
  }

  const text = STRING_FIELDS.map((field) => rec?.[field]).filter((s) => typeof s === 'string').join('\n');
  if (/\b(?:Bot Protection|BotID|bot_filter|WAF)\b/i.test(text) &&
      !/\bstaged\b[\s\S]{0,80}\b(?:log|allowlist|exclusions?)\b/i.test(text)) {
    const caveat = ' Use a staged rollout that starts in Log mode where available, then moves to the appropriate Challenge or Deny action only after allowlist/exclusion review for known monitoring and partner clients.';
    if (typeof rec.fix === 'string') rec.fix += caveat;
    else rec.fix = caveat.trim();
    tags.push('bot-protection-certainty:staged-rollout');
  }

  return tags.length > 0 ? { tags, needsReview: true } : {};
}
