// Recommend BotID only when there's EVIDENCE of bot traffic or scale large enough that the rec is defensible.
// Without an evidence gate the rec fires on quiet hobby sites and erodes trust.
const MIN_BOT_PCT = 0.05;
const MIN_EDGE_COST = 25;          // halved for 14d window
const MIN_TOTAL_REQUESTS = 14_000; // ~14k/14d matches the prior 30k/30d rate
const MIN_TOTAL_FDT_BYTES = 1_000_000;

export const metadata = {
  id: 'platform_bot_protection',
  threshold: 'botIdEnabled=false AND (botPct >= 0.05 OR edge_cost >= $25/window OR requests >= 14k/14d)',
  billingDimension: 'edge-requests',
  scope: 'account',
  sourceCitation: 'vercel-optimize gate threshold',
  description:
    'When BotID is disabled AND there is evidence (observed bot bandwidth share, edge cost, or substantial request volume) that bot traffic is non-trivial. Bot traffic inflates edge request counts without delivering user value; staged bot protection can reduce waste on bot-heavy projects. Skipped on quiet projects with no bot evidence — the recommendation would be noise.',
};

export function gate(signals) {
  // BotID surfaces under several legacy fields; check all.
  const botEnabled =
    signals.project?.security?.botIdEnabled === true
    || signals.project?.security?.botProtection === true
    || signals.project?.botProtection?.enabled === true
    || signals.project?.delegatedProtection?.bot === true;
  if (botEnabled) return [];

  // Project config failed — we can't tell if BotID is on, so stay silent.
  if (signals.project?.error) return [];

  const totalRequests = totalRequestsFromSignals(signals);
  const botShare = computeBotShare(signals);
  const edgeService = (signals.usage?.services ?? []).find(
    (s) => /edge.request/i.test(s.name ?? '')
  );
  const edgeCost = edgeService?.billedCost ?? null;

  // Require observable bot share, edge cost, OR substantial traffic — otherwise rec is just config nagging.
  const hasObservedBots = botShare?.botPct != null && botShare.botPct >= MIN_BOT_PCT;
  const hasMaterialEdgeCost = edgeCost != null && edgeCost >= MIN_EDGE_COST;
  const hasSubstantialTraffic = totalRequests >= MIN_TOTAL_REQUESTS;
  if (!hasObservedBots && !hasMaterialEdgeCost && !hasSubstantialTraffic) return [];

  const challengeRule = signals.project?.security?.managedRules?.bot_filter;
  const ruleNote = challengeRule?.active
    ? `firewall bot_filter rule active (action=${challengeRule.action ?? '?'})`
    : 'no firewall bot_filter rule';

  // Kicker on high observed bot share — harder evidence than config alone.
  let priority = edgeCost != null ? Math.max(20, Math.round(edgeCost)) : 30;
  if (botShare?.botPct != null && botShare.botPct > 0.2) priority += 20;

  // Confidence bumps when we can SEE bot traffic, not just infer from config.
  let confidence = edgeCost != null ? 0.85 : 0.6;
  if (botShare?.botPct != null && botShare.botPct > 0.2) confidence = Math.min(0.95, confidence + 0.05);

  const botShareNote = botShare?.botPct != null
    ? `bot_fdt_pct=${(botShare.botPct * 100).toFixed(0)}%`
    : 'bot_fdt_pct=unknown';

  return [{
    kind: metadata.id,
    scope: 'account',
    files: [],
    priority,
    confidence,
    o11ySignal: edgeCost != null
      ? `edge_cost=${edgeCost.toFixed(0)},bot_protection=disabled,${botShareNote},${ruleNote}`
      : `requests=${totalRequests},bot_protection=disabled,${botShareNote},${ruleNote}`,
    reason: botShare?.botPct != null && botShare.botPct > 0.2
      ? 'BotID disabled with observable bot bandwidth share'
      : 'BotID disabled with observable traffic',
    question: botShare?.botPct != null && botShare.botPct > 0.2
      ? `Bot traffic accounts for ${(botShare.botPct * 100).toFixed(0)}% of FDT bytes (top category: ${botShare.topCategory ?? 'unknown'}). Would enabling BotID + a challenge rule reduce that share?`
      : 'Would enabling BotID (Bot Protection) reduce edge request volume from automated traffic?',
    evidence: {
      botEnabled: false,
      edgeCost,
      totalRequests,
      managedRules: challengeRule ?? null,
      botShare: botShare ?? null,
    },
  }];
}

function totalRequestsFromSignals(signals) {
  const rows = signals.metrics?.requestsByRouteCache?.rows;
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((s, r) => s + (r.value ?? 0), 0);
}

// CLI convention: bot_category="" means "not classified as a bot" (human + unclassified); any non-empty = bot.
function computeBotShare(signals) {
  const rows = signals.metrics?.fdtByBot?.rows;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let humanBytes = 0;
  let botBytes = 0;
  let topCategory = null;
  let topBytes = 0;
  for (const r of rows) {
    const v = r.value ?? 0;
    const cat = r.bot_category ?? '';
    if (cat === '') {
      humanBytes += v;
    } else {
      botBytes += v;
      if (v > topBytes) {
        topBytes = v;
        topCategory = cat;
      }
    }
  }
  const total = humanBytes + botBytes;
  if (total < MIN_TOTAL_FDT_BYTES) return null;
  return { humanBytes, botBytes, botPct: botBytes / total, topCategory };
}
