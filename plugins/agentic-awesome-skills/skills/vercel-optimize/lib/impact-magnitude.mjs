// Rule: precision for performance, magnitudes for cost. Customer-facing phrases never contain $N literals.

export function impactMagnitude({ currentCost, impactTier }) {
  // Billed spend and an impact tier cannot establish a savings fraction or a monthly rate.
  // Preserve the public shape while withholding a fabricated savings magnitude.
  return { magnitude: 'unmeasured', phrase: 'cost savings require before-and-after measurement' };
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
