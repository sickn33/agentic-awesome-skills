// Detects per-day billing spikes by inspecting usage.breakdown.data[] (daily granularity).
// Fires when any single day's total bill > 2× the window mean, OR a single SKU's day value > 3× its window mean.
// Emits one candidate per spiking SKU (or 'total' when the spike is broad).
// Degrades gracefully when daily data is unavailable — common path because the skill prefers --group-by project, which omits daily breakdown.
export const metadata = {
  id: 'usage_spike_triage',
  threshold: 'any-day total > 2x mean OR any-day SKU > 3x SKU mean',
  billingDimension: 'mixed',
  scope: 'account',
  sourceCitation: 'vercel-optimize gate threshold',
  description:
    'A single day in the billing window deviates sharply from the window baseline. Triage branches: bot or AI crawler spike, viral moment, pricing-model migration (legacy SKU → new), code regression. Without daily-granularity data, this gate stays dormant.',
};

const TOTAL_MULTIPLIER = 2;
const SKU_MULTIPLIER = 3;
const MIN_BILLED_FLOOR = 5; // skip spikes whose absolute value is too small to matter

export function gate(signals) {
  const days = signals?.usage?.breakdown?.data;
  if (!Array.isArray(days) || days.length < 3) return [];

  const dayTotals = days.map(dayTotal);
  const mean = dayTotals.reduce((a, b) => a + b, 0) / dayTotals.length;
  if (mean <= MIN_BILLED_FLOOR) return [];

  const totalSpikeDays = dayTotals
    .map((value, idx) => ({ idx, value }))
    .filter((d) => d.value > mean * TOTAL_MULTIPLIER && d.value > MIN_BILLED_FLOOR);

  const skuStats = aggregateSkuStats(days);
  const skuSpikes = [];
  for (const stat of skuStats) {
    if (stat.mean <= MIN_BILLED_FLOOR) continue;
    for (const sample of stat.samples) {
      if (sample.value > stat.mean * SKU_MULTIPLIER && sample.value > MIN_BILLED_FLOOR) {
        skuSpikes.push({
          name: stat.name,
          dayIndex: sample.idx,
          dayValue: sample.value,
          skuMean: stat.mean,
          multiplier: stat.mean > 0 ? sample.value / stat.mean : null,
        });
      }
    }
  }

  if (totalSpikeDays.length === 0 && skuSpikes.length === 0) return [];

  const candidates = [];
  if (totalSpikeDays.length > 0) {
    const peak = totalSpikeDays.reduce((a, b) => (a.value > b.value ? a : b));
    candidates.push({
      kind: metadata.id,
      scope: 'account',
      files: [],
      priority: 60,
      confidence: 0.78,
      o11ySignal: `total_spike day_idx=${peak.idx} day_billed=${peak.value.toFixed(2)} window_mean=${mean.toFixed(2)} mult=${(peak.value / mean).toFixed(1)}x`,
      reason: 'total billed cost on one day exceeds 2× the window mean',
      question: 'Which workload generated the day-over-day spike — bot or AI-crawler traffic on a cacheable route, a viral event, a pricing-model migration, or a code regression?',
      evidence: {
        metric: 'usage.breakdown.data.total',
        spikeDay: peak.idx,
        spikeBilled: peak.value,
        windowMean: mean,
        multiplier: peak.value / mean,
        skuName: 'total',
      },
    });
  }
  // Up to 3 SKU-specific candidates; the rest fold into 'multiple SKUs spiking' framing.
  const orderedSkuSpikes = skuSpikes.sort((a, b) => b.dayValue - a.dayValue).slice(0, 3);
  for (const spike of orderedSkuSpikes) {
    candidates.push({
      kind: metadata.id,
      scope: 'account',
      files: [],
      priority: 55,
      confidence: 0.78,
      o11ySignal: `sku_spike sku="${spike.name}" day_idx=${spike.dayIndex} day_billed=${spike.dayValue.toFixed(2)} sku_mean=${spike.skuMean.toFixed(2)} mult=${spike.multiplier.toFixed(1)}x`,
      reason: `${spike.name} on one day exceeds 3× its window mean`,
      question: `${spike.name} spiked ${spike.multiplier.toFixed(1)}× on day ${spike.dayIndex}. Which event (bot traffic, viral content, deploy regression, integration sync) drove it, and is the spiking SKU one the skill already covers?`,
      evidence: {
        metric: 'usage.breakdown.data.services',
        skuName: spike.name,
        spikeDay: spike.dayIndex,
        spikeBilled: spike.dayValue,
        skuMean: spike.skuMean,
        multiplier: spike.multiplier,
      },
    });
  }
  return candidates;
}

function dayTotal(day) {
  if (Array.isArray(day?.services)) {
    return day.services.reduce((a, s) => a + Number(s.billedCost ?? s.cost ?? 0), 0);
  }
  return Number(day?.billedCost ?? day?.cost ?? 0);
}

function aggregateSkuStats(days) {
  const byName = new Map();
  days.forEach((day, idx) => {
    const services = Array.isArray(day?.services) ? day.services : [];
    for (const svc of services) {
      const name = String(svc?.name ?? '').trim();
      if (!name) continue;
      const value = Number(svc.billedCost ?? svc.cost ?? 0);
      if (!byName.has(name)) byName.set(name, { name, samples: [] });
      byName.get(name).samples.push({ idx, value });
    }
  });
  for (const stat of byName.values()) {
    const sum = stat.samples.reduce((a, s) => a + s.value, 0);
    stat.mean = stat.samples.length > 0 ? sum / stat.samples.length : 0;
  }
  return [...byName.values()];
}
