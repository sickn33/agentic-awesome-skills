export function splitCustomerSafeObservations(observations, abstentions = [], signals = {}) {
  const safe = [];
  const heldBack = [];
  for (const observation of Array.isArray(observations) ? observations : []) {
    const unsafeReason = unsupportedObservationReason(observation, abstentions, signals);
    if (unsafeReason) {
      heldBack.push({
        candidateRef: observation?.candidateRef ?? null,
        reason: unsafeReason,
        needsEvidence: true,
      });
    } else {
      safe.push(observation);
    }
  }
  return { observations: safe, heldBackObservations: heldBack };
}

function unsupportedObservationReason(observation, abstentions = [], signals = {}) {
  if (contradictsNoChangeReason(observation, abstentions)) {
    return 'This observation repeated an action that another investigation rejected. Re-run with a single scoped candidate before applying it.';
  }
  if (hasUnsupportedWafBotCategoryClaim(observation)) {
    return 'This observation described an Observability bot category as a WAF-rule condition without supported rule evidence. Re-run with documented WAF condition evidence before applying it.';
  }
  if (hasUnsafeBotProtectionObservation(observation)) {
    return 'This observation recommended Bot Protection or WAF changes without a staged safe-rollout plan and allowlist review. Promote it to a verified platform recommendation before applying it.';
  }
  if (hasStaleNextCacheApiObservation(observation, signals)) {
    return 'This observation used a cache API that does not match the detected framework-version evidence. Re-run with the current Next.js cache evidence before applying it.';
  }
  if (hasUnsupportedFrameworkCausalClaim(observation)) {
    return 'This observation made a framework-specific cause claim that verification could not support. Re-run with runtime logs or official framework evidence before applying it.';
  }
  if (hasUnsupportedStaticGenerationClaim(observation)) {
    return 'This observation made a static-generation behavior claim that verification could not support. Re-run with route-manifest or runtime evidence before applying it.';
  }
  if (hasUnsupportedSourceAbsenceClaim(observation)) {
    return 'This observation made a source-file absence claim that verification could not support. Re-run with a file-existence check or runtime logs before applying it.';
  }
  if (hasUnsupportedCacheLifeCdnClaim(observation)) {
    return 'This observation depended on an unsupported cacheLife-to-CDN claim. Re-run with production header evidence before applying it.';
  }
  if (hasUnsupportedRuntimeRootCauseClaim(observation)) {
    return 'This observation made a runtime root-cause claim that needs log, stack, or upstream response evidence before it can ship.';
  }
  if (hasImplementationGradeObservationAction(observation)) {
    return 'This observation described an implementation change that needs the ready-to-apply recommendation evidence bar before it can ship.';
  }
  return null;
}

function observationText(observation) {
  return [
    observation?.summary,
    observation?.evidence,
    observation?.suggestedAction,
  ].filter(Boolean).join(' ');
}

function evidenceText(observation) {
  return [
    observation?.summary,
    observation?.evidence,
  ].filter(Boolean).join(' ');
}

function hasUnsupportedWafBotCategoryClaim(observation) {
  const text = observationText(observation);
  if (!/\bWAF\b/i.test(text)) return false;
  return /\bbot_category\s*=/i.test(text) ||
    /\btarget(?:ing)?\s+(?:browser_impersonation|automated_browser|ecommerce|monitor)\b/i.test(text);
}

function hasUnsafeBotProtectionObservation(observation) {
  const text = observationText(observation);
  if (!/\b(?:Bot Protection|BotID|bot_filter|WAF|managed bot rules?)\b/i.test(text)) return false;
  const recommendsAction = /\b(?:enable|add|create|configure|challenge|deny|block|rate-limit|target)\b/i.test(String(observation?.suggestedAction ?? ''));
  if (!recommendsAction) return false;
  const hasSafeRollout = /\b(?:staged|log mode|log action|dry run)\b/i.test(text);
  const hasAllowlist = /\ballowlist|exclusions?\b/i.test(text);
  return !(hasSafeRollout && hasAllowlist);
}

function hasStaleNextCacheApiObservation(observation, signals = {}) {
  const text = observationText(observation);
  if (!/\bunstable_cache\b/.test(text)) return false;
  if (signals?.stack?.framework !== 'next') return false;
  const major = parseInt(String(signals?.stack?.frameworkVersion ?? '').match(/\d+/)?.[0] ?? '', 10);
  return Number.isFinite(major) && major >= 16;
}

function hasImplementationGradeObservationAction(observation) {
  const action = String(observation?.suggestedAction ?? '');
  if (action.trim() === '') return false;
  if (/\b(?:use cache:\s*remote|unstable_cache|Cache-Control|s-maxage|cacheLife|export const revalidate|checkBotId|BotID)\b/i.test(action)) return true;
  return /\b(?:enable|add|wrap|apply|move|parallelize|set|create|configure|deny|challenge|block|fix|replace|refactor|rewrite|upgrade|downgrade)\b/i.test(action) ||
    /\bcache\s+(?:the|this|that|shared|public|origin|response|route|data|lookup|fetch|helper)\b/i.test(action) ||
    /\bturn\s+(?:on|off)\b/i.test(action) ||
    /\bswitch\s+(?:to|from|the|this)\b/i.test(action) ||
    /\buse\s+Promise\.all\b/i.test(action) ||
    /\b(?:raise|lower|increase|decrease)\s+(?:the\s+)?(?:TTL|timeout|memory|CPU|cache|cache lifetime|duration)\b/i.test(action);
}

function contradictsNoChangeReason(observation, abstentions) {
  const target = candidateTarget(observation?.candidateRef);
  if (!target) return false;
  const lowerObservationText = observationText(observation).toLowerCase();
  const relevantReasons = abstentions
    .filter((a) => candidateTarget(a?.candidateRef) === target)
    .map((a) => String(a?.reason ?? '').toLowerCase());
  if (relevantReasons.length === 0) return false;

  if (/\bparalleliz(?:e|ing)\b/.test(lowerObservationText) &&
      /\bgetsession\b/.test(lowerObservationText) &&
      relevantReasons.some((reason) => /\bgetsession\b/.test(reason) && /\b(?:gates?|redirect|auth-preserving|blocked)\b/.test(reason))) {
    return true;
  }
  return false;
}

function candidateTarget(ref) {
  if (typeof ref !== 'string') return null;
  const idx = ref.indexOf(':');
  if (idx === -1) return null;
  return ref.slice(idx + 1);
}

function hasUnsupportedFrameworkCausalClaim(observation) {
  const text = observationText(observation).toLowerCase();
  if (!text.includes('notfound') || !text.includes('use cache')) return false;
  return (
    /known next\.js cache components edge case/.test(text) ||
    /next\.js\s+\d+(?:\.\d+)?[^.]{0,120}treats[^.]{0,120}dynamic api/.test(text) ||
    /can surface as 5xx/.test(text) ||
    /surface as 500/.test(text) ||
    /instead of throwing inside (?:the )?cache/.test(text) ||
    /cache boundary/.test(text)
  );
}

function hasUnsupportedStaticGenerationClaim(observation) {
  const text = observationText(observation).toLowerCase();
  if (!/\bgeneratestaticparams\b/.test(text)) return false;
  return /\b(?:returns?\s*(?:an\s+)?empty|\[\])\b[^.\n]{0,240}\b(?:every request|on[- ]demand|no params? (?:are )?prebuilt|populate generatestaticparams|served from (?:the )?cdn|hit bucket|cachebreakdown)\b/i.test(text) ||
    /\b(?:every request|on[- ]demand|no params? (?:are )?prebuilt|populate generatestaticparams|served from (?:the )?cdn|hit bucket|cachebreakdown)\b[^.\n]{0,240}\b(?:returns?\s*(?:an\s+)?empty|\[\])\b/i.test(text) ||
    /\bdynamic\s*=\s*['"`]error['"`]\b[^.\n]{0,240}\b(?:generatestaticparams|dynamicparams|every request|on[- ]demand)\b/i.test(text);
}

function hasUnsupportedSourceAbsenceClaim(observation) {
  const ref = String(observation?.candidateRef ?? '');
  if (!ref.startsWith('route_errors:')) return false;
  const text = observationText(observation).toLowerCase();
  return /\b(?:enoent|no\s+(?:matching|corresponding)\s+(?:mdx|file|post)|missing\s+(?:mdx|file|post)|does\s+not\s+exist|not\s+found\s+on\s+disk)\b/.test(text);
}

function hasUnsupportedCacheLifeCdnClaim(observation) {
  return hasUnsupportedCacheLifeCdnText(observationText(observation));
}

export function hasUnsupportedCacheLifeCdnText(text) {
  if (typeof text !== 'string' || !/\bcacheLife\b/i.test(text)) return false;
  if (/\btoLaunch-\d+\b/i.test(text)) return true;
  return /\bcacheLife\b[^.\n]{0,240}\b(?:Cache-Control|s-maxage|CDN|edge cache|cache breakdown|x-vercel-cache|HIT|MISS|function (?:still )?runs per request|every request invokes the function|canonical|toLaunch-\d+)\b/i.test(text) ||
    /\b(?:Cache-Control|s-maxage|CDN|edge cache|cache breakdown|x-vercel-cache|HIT|MISS|function (?:still )?runs per request|every request invokes the function|canonical|toLaunch-\d+)\b[^.\n]{0,240}\bcacheLife\b/i.test(text) ||
    /\b(?:no|never|without|missing)\s+cacheLife\b[^.\n]{0,240}\b(?:no|not|never|0%|every|per request|function)\b[^.\n]{0,120}\b(?:cache|cached|hit|runs?|invoke)/i.test(text);
}

function hasUnsupportedRuntimeRootCauseClaim(observation) {
  const text = observationText(observation);
  if (!/\b(?:caused by|root cause|responsible for failures|would produce)\b/i.test(text)) return false;
  if (!/\b(?:5xx|500|error|failures?)\b/i.test(text)) return false;
  return !/\b(?:logs?\s+(?:show|confirm|include|contain)|stack\s+(?:shows|trace|evidence)|trace\s+(?:shows|confirms)|exception\s+(?:shows|confirms)|response body\s+(?:shows|confirms)|runtime evidence)\b/i.test(evidenceText(observation));
}
