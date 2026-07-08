// Rule: precision for performance, magnitudes for cost. Customer-facing phrases never contain $N literals.

export function impactMagnitude({ currentCost, impactTier }) {
  const fraction = { high: 0.4, medium: 0.2, low: 0.1 }[impactTier] ?? 0.2;
  const estUsd = (currentCost ?? 0) * fraction;

  if (estUsd < 5) {
    return { magnitude: 'negligible', phrase: 'small cost impact at current traffic' };
  }
  if (estUsd < 50) {
    return { magnitude: 'small', phrase: 'low-tens of dollars per month at current traffic' };
  }
  if (estUsd < 500) {
    return { magnitude: 'medium', phrase: 'hundreds of dollars per month at current traffic' };
  }
  if (estUsd < 5000) {
    return { magnitude: 'large', phrase: 'low-thousands of dollars per month at current traffic' };
  }
  return { magnitude: 'very-large', phrase: 'thousands+ of dollars per month at current traffic' };
}

// Preserves Postgres placeholders ($1, $2, …) — digits with no comma/period/k/m suffix.
export function stripDollarLiterals(text) {
  if (!text || typeof text !== 'string') return { text, stripped: 0 };

  let count = 0;
  const cleaned = text.replace(
    /\$[\d][\d.,]*(?:[kKmMbB])?(?:\/[\dA-Za-z]+)?/g,
    (m) => {
      if (/^\$\d+$/.test(m)) return m;
      count++;
      return 'the billed cost';
    }
  );

  return { text: cleaned, stripped: count };
}

export function applyDollarStrip(rec) {
  const fields = ['what', 'why', 'fix', 'impact', 'currentBehavior', 'desiredBehavior', 'before', 'after'];
  let totalStripped = 0;
  for (const f of fields) {
    if (typeof rec[f] !== 'string') continue;
    // Preserve code-fence content so example snippets aren't mangled.
    const fences = [];
    rec[f] = rec[f].replace(/```[\s\S]*?```/g, (m) => {
      fences.push(m);
      return `__FENCE_${fences.length - 1}__`;
    });
    const { text, stripped } = stripDollarLiterals(rec[f]);
    rec[f] = text;
    totalStripped += stripped;
    rec[f] = rec[f].replace(/__FENCE_(\d+)__/g, (_, i) => fences[Number(i)]);
  }
  if (totalStripped > 0) {
    rec.sanitizerTrail = rec.sanitizerTrail ?? [];
    rec.sanitizerTrail.push(`$-strip:${totalStripped}`);
  }
  return rec;
}
