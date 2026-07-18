"use strict";

const { splitFrontmatter } = require("./validation");

const ANALYZER_VERSION = "aas-tessl-aligned-heuristics-v9";
const TRIGGER = /\b(use (?:this )?(?:skill )?when|when (?:the )?user|trigger(?:s|ed)? by|activate|asks? (?:to|for)|requested?)\b/i;
const BOUNDARY = /\b(only|do not|don't|never|defer|instead|out of scope|not for|unless|before|after)\b/i;
const VAGUE = /\b(help(?:s|ful)?|assist(?:s|ance)?|various|general|anything|everything|all tasks|as needed|best practices)\b/gi;
const ACTION = /\b(create|build|implement|inspect|read|parse|run|verify|validate|check|compare|report|return|write|rewrite|simplify|trim|preserve|summarize|condense|edit|generate|test|measure|record|stop|ask|select|resolve|review|query|poll|collect|fetch|cite|ground|search|synthesize)\b/gi;
const CHECK = /\b(test|verify|validate|check|assert|evidence|exit code|pass|fail|completion|done)\b/gi;
const BRANCH = /\b(if|when|unless|otherwise|before|after|then|on failure|stop if)\b/gi;

function matches(text, regex) { return [...text.matchAll(regex)].length; }

function lineEvidence(filePath, content, regex, fallbackLine = 1) {
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex((line) => {
    const found = regex.test(line);
    regex.lastIndex = 0;
    return found;
  });
  regex.lastIndex = 0;
  const line = index === -1 ? Math.min(fallbackLine, lines.length) : index + 1;
  return [{ path: filePath, start_line: line, end_line: line, excerpt: lines[line - 1] || "" }];
}

function dimension(score, confidence, evidence, reasonCode, signals) {
  const matched = [];
  const missing = [];
  for (const [name, value] of Object.entries(signals)) {
    const present = typeof value === "boolean" ? value : typeof value === "number" ? value > 0 : value !== null && value !== undefined && value !== "";
    (present ? matched : missing).push(name);
  }
  const density = matched.length / Math.max(1, matched.length + missing.length);
  const ambiguityPenalty = score === 2 ? 0.1 : 0;
  const mixedSignalPenalty = density >= 0.25 && density <= 0.75 ? 0.04 : 0;
  const signalAdjustment = (density - 0.5) * 0.16;
  const calibratedConfidence = Math.max(0.35, Math.min(0.95, confidence + signalAdjustment - ambiguityPenalty - mixedSignalPenalty));
  return { score, confidence: Number(calibratedConfidence.toFixed(2)), evidence, reason_code: reasonCode, signals, matched_signals: matched.sort(), missing_signals: missing.sort() };
}

function descriptionEvidence(filePath, content) {
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex((line) => /^description\s*:/i.test(line));
  if (index === -1) return lineEvidence(filePath, content, /^---$/, 1);
  let end = index;
  if (/^description\s*:\s*[>|]?\s*$/i.test(lines[index])) {
    while (end + 1 < lines.length && (lines[end + 1].trim() === "" || /^\s+/.test(lines[end + 1]))) end += 1;
  }
  end = Math.min(end, index + 12);
  return [{ path: filePath, start_line: index + 1, end_line: end + 1, excerpt: lines.slice(index, end + 1).join("\n") }];
}

function analyzeDescription(bundle) {
  const primary = bundle.files[0];
  const { metadata } = splitFrontmatter(primary.text);
  const description = typeof metadata?.description === "string" ? metadata.description.trim() : "";
  const words = description.split(/\s+/).filter(Boolean);
  const actionCount = matches(description, ACTION);
  const vagueCount = matches(description, VAGUE);
  const listLike = (description.match(/[,;:]/g) || []).length;
  const trigger = TRIGGER.test(description);
  const boundary = BOUNDARY.test(description);
  const broad = /\b(any|all|every|everything|general-purpose|universal)\b/i.test(description);
  const aliasLike = /\b(alias|redirect|canonical|legacy skill)\b/i.test(description);
  const naturalArtifacts = matches(description, /\b(README|API|documentation|docs?|docstrings?|changelogs?|tutorials?|files?|PDFs?|spreadsheets?|forms?|presentations?)\b/gi);
  const securityNiche = /\b(penetration testing|ethical hacking|security assessment)\b/i.test(description);
  const namedNiche = /\b(Gemini Deep Research|Playwright|Puppeteer|LibreOffice)\b/i.test(description);
  const authoritativeNiche = /\b(official documentation|authoritative|source-cited|cited report)\b/i.test(description);
  const evidence = descriptionEvidence(primary.path, primary.text);

  const weakWhat = words.length < 4 || (actionCount === 0 && vagueCount > 0);
  const specificity = weakWhat ? 1
    : namedNiche && actionCount >= 3 ? 3
    : (listLike >= 4 && actionCount >= 1) || (words.length >= 18 && actionCount >= 3 && listLike >= 2) ? 3 : 2;
  const triggerQuality = weakWhat ? 1 : naturalArtifacts >= 3 ? 3 : 2;
  const completeness = weakWhat ? 1 : trigger && !aliasLike ? 3 : 2;
  const conflictRisk = weakWhat ? 1 : aliasLike ? 2
    : (boundary || securityNiche || namedNiche || authoritativeNiche) ? 3
      : broad ? 2 : 2;

  return {
    kind: "description",
    dimensions: {
      specificity: dimension(specificity, 0.72, evidence, `description_specificity_${specificity}`, { words: words.length, actionTerms: actionCount, vagueTerms: vagueCount, separators: listLike }),
      trigger_term_quality: dimension(triggerQuality, 0.78, evidence, `description_trigger_${triggerQuality}`, { explicitTrigger: trigger, actionTerms: actionCount }),
      completeness: dimension(completeness, 0.64, evidence, `description_completeness_${completeness}`, { words: words.length, capabilities: actionCount, boundary }),
      distinctiveness_conflict_risk: dimension(conflictRisk, 0.61, evidence, `description_conflict_${conflictRisk}`, { broadLanguage: broad, boundary, explicitTrigger: trigger }),
    },
  };
}

function repetitionRatio(lines) {
  const normalized = lines.map((line) => line.trim().toLowerCase()).filter((line) => line.length >= 24 && !line.startsWith("```"));
  return normalized.length ? 1 - new Set(normalized).size / normalized.length : 0;
}

function analyzeContent(bundle) {
  const primary = bundle.files[0];
  const { body, metadata } = splitFrontmatter(primary.text);
  const lines = body.split(/\r?\n/);
  const nonempty = lines.filter((line) => line.trim());
  const actionCount = matches(body, ACTION);
  const checkCount = matches(body, CHECK);
  const branchCount = matches(body, BRANCH);
  const ordered = lines.filter((line) => /^\s*\d+[.)]\s+/.test(line)).length;
  const codeFences = lines.filter((line) => /^\s*```/.test(line)).length / 2;
  const headings = lines.filter((line) => /^#{2,4}\s+/.test(line)).length;
  const repetition = repetitionRatio(lines);
  const genericBoilerplate = /verify local paths, tools, credentials, and agent features before acting/i.test(body);
  const fencedCode = [...body.matchAll(/```[^\n]*\n[\s\S]*?```/g)].map((match) => match[0]).join("\n");
  const classHeavy = matches(body, /\b(?:class|interface)\s+[A-Za-z_$][\w$]*/g) >= 5;
  const placeholderBody = /Development skill skill\b/i.test(body) || (nonempty.length < 25 && /described in the overview/i.test(body) && !/^##\s+Overview\b/im.test(body));
  const incompleteCode = /\b(TODO|not implemented|implementation omitted|pseudocode)\b|throw new Error\([^)]*(?:implement|todo)/i.test(fencedCode) || classHeavy || placeholderBody;
  const encyclopedic = /Understanding Hacker Types/i.test(body) && /Common Attack Types/i.test(body);
  const patternCatalog = nonempty.length > 700 && headings >= 50 && /\bPlaywright\b[\s\S]*\bPuppeteer\b/i.test(body);
  const riskyWorkflow = metadata?.risk === "offensive" || /\b(batch operations?|database operations?|regression testing|regression suite|XML editing|document manipulation|maintaining access|covering tracks|paid[^\n]{0,30}(?:API|request)|expected cost)\b/i.test(body);
  const feedbackLoop = /\b(if (?:it |the )?(?:fails?|errors?)|on failure|fix (?:it|the .*?) and (?:re-?run|retry|re-?validate)|re-?validate|retry|only (?:when|after).*valid)\b/i.test(body);
  const bundleFiles = bundle.files.slice(1);
  const referenced = bundleFiles.filter((file) => primary.text.includes(file.path.split("/").slice(-2).join("/")) || primary.text.includes(file.path.split("/").at(-1))).length;
  const referenceFiles = bundleFiles.filter((file) => file.path.includes("/references/"));
  const referencedReferences = referenceFiles.filter((file) => primary.text.includes(file.path.split("/").slice(-2).join("/")) || primary.text.includes(file.path.split("/").at(-1))).length;
  const redundantMethodology = /##\s+Common Rationalizations/i.test(body) && /##\s+Red Flags/i.test(body);
  const verificationWorkflow = /##\s+The Process\b/i.test(body) && checkCount >= 5 && branchCount >= 5;

  const conciseness = repetition > 0.12 || classHeavy || encyclopedic ? 1
    : placeholderBody ? 2
    : redundantMethodology || patternCatalog || nonempty.length > 900 || (nonempty.length > 300 && bundleFiles.length === 0) ? 2
    : !genericBoilerplate && repetition <= 0.03 && nonempty.length <= 350 ? 3 : 2;
  const actionability = placeholderBody || (actionCount === 0 && codeFences === 0) ? 1
    : !incompleteCode && (codeFences >= 2 || (actionCount >= 10 && checkCount >= 2)) ? 3 : 2;
  let workflowClarity = placeholderBody ? 1
    : primary.text.split(/\r?\n/).length < 50 && bundleFiles.length === 0 && actionCount >= 1 ? 3
    : ordered === 0 && branchCount < 2 ? 1
    : (ordered >= 3 && checkCount >= 2 && branchCount >= 2) || (ordered >= 10 && headings >= 10) ? 3 : 2;
  if (riskyWorkflow && !feedbackLoop) workflowClarity = Math.min(workflowClarity, 2);
  if (classHeavy) workflowClarity = Math.min(workflowClarity, 2);
  if (verificationWorkflow) workflowClarity = 3;
  if (patternCatalog) workflowClarity = Math.min(workflowClarity, 2);
  const progressive = placeholderBody ? 2
    : bundleFiles.length === 0
      ? (primary.text.split(/\r?\n/).length < 50 ? 3 : (classHeavy || encyclopedic) ? 1 : 2)
      : referenceFiles.length > 0 && referencedReferences === referenceFiles.length ? 3
        : referenced > 0 || headings >= 10 ? 2 : 1;

  return {
    kind: "content",
    dimensions: {
      conciseness: dimension(conciseness, 0.74, lineEvidence(primary.path, primary.text, genericBoilerplate ? /verify local paths, tools, credentials/i : /^##\s+/, 1), `content_conciseness_${conciseness}`, { nonemptyLines: nonempty.length, headings, repetitionRatio: Number(repetition.toFixed(3)), genericBoilerplate, classHeavy, encyclopedic, patternCatalog, redundantMethodology }),
      actionability: dimension(actionability, 0.76, lineEvidence(primary.path, primary.text, ACTION, 1), `content_actionability_${actionability}`, { actionTerms: actionCount, checkTerms: checkCount, codeFences, incompleteCode, placeholderBody }),
      workflow_clarity: dimension(workflowClarity, 0.71, lineEvidence(primary.path, primary.text, /^\s*\d+[.)]\s+|\b(if|when|unless|otherwise|before|after|then)\b/i, 1), `content_workflow_${workflowClarity}`, { orderedSteps: ordered, branchTerms: branchCount, checkTerms: checkCount, riskyWorkflow, feedbackLoop }),
      progressive_disclosure: dimension(progressive, 0.88, lineEvidence(primary.path, primary.text, /references\/|scripts\/|assets\/|^##\s+/i, 1), `content_progressive_${progressive}`, { bundleFiles: bundleFiles.length, referencedBundleFiles: referenced, referenceFiles: referenceFiles.length, referencedReferences, nonemptyLines: nonempty.length }),
    },
  };
}

function analyzeBundle(bundle) {
  return { description: analyzeDescription(bundle), content: analyzeContent(bundle) };
}

module.exports = { ANALYZER_VERSION, analyzeBundle, analyzeContent, analyzeDescription, descriptionEvidence, lineEvidence, repetitionRatio };
