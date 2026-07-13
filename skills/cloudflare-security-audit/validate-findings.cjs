#!/usr/bin/env node
/**
 * validate-findings.cjs
 * Validates a SECURITY_AUDIT.json file against the schema
 */

const fs = require('fs');
const path = require('path');

function validateReport(reportPath) {
  const errors = [];
  const warnings = [];
  
  try {
    const content = fs.readFileSync(reportPath, 'utf8');
    const report = JSON.parse(content);
    
    // Check required top-level fields
    if (!report.metadata) errors.push('Missing metadata');
    if (!report.summary) errors.push('Missing summary');
    if (!report.findings) errors.push('Missing findings');
    if (!Array.isArray(report.findings)) errors.push('findings must be an array');
    
    // Validate metadata
    if (report.metadata) {
      if (!report.metadata.timestamp) errors.push('Missing metadata.timestamp');
      if (!report.metadata.target) errors.push('Missing metadata.target');
      if (!report.metadata.auditor) errors.push('Missing metadata.auditor');
      if (!Array.isArray(report.metadata.phases_completed)) {
        errors.push('Missing or invalid metadata.phases_completed');
      }
    }
    
    // Validate summary
    if (report.summary) {
      if (typeof report.summary.total_findings !== 'number') {
        errors.push('Missing or invalid summary.total_findings');
      }
      if (!report.summary.by_severity) {
        errors.push('Missing summary.by_severity');
      }
    }
    
    // Validate findings
    if (Array.isArray(report.findings)) {
      report.findings.forEach((finding, index) => {
        const prefix = `findings[${index}]`;
        
        if (!finding.id) errors.push(`${prefix}: Missing id`);
        if (!finding.attack_class) errors.push(`${prefix}: Missing attack_class`);
        if (!finding.title) errors.push(`${prefix}: Missing title`);
        if (!finding.severity) errors.push(`${prefix}: Missing severity`);
        if (!finding.file) errors.push(`${prefix}: Missing file`);
        if (typeof finding.line !== 'number') errors.push(`${prefix}: Missing or invalid line`);
        if (!finding.code_snippet) errors.push(`${prefix}: Missing code_snippet`);
        if (!finding.description) errors.push(`${prefix}: Missing description`);
        if (!finding.evidence) errors.push(`${prefix}: Missing evidence`);
        if (!finding.remediation) errors.push(`${prefix}: Missing remediation`);
        
        // Validate severity
        const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
        if (finding.severity && !validSeverities.includes(finding.severity)) {
          errors.push(`${prefix}: Invalid severity "${finding.severity}"`);
        }
        
        // Validate attack_class format
        if (finding.attack_class && !/^A\d{1,2}$/.test(finding.attack_class)) {
          warnings.push(`${prefix}: attack_class "${finding.attack_class}" doesn't match expected format (e.g., A1, A14)`);
        }
        
        // Validate id format
        if (finding.id && !/^FINDING-\d{3,}$/.test(finding.id)) {
          warnings.push(`${prefix}: id "${finding.id}" doesn't match expected format (e.g., FINDING-001)`);
        }
      });
    }
    
    // Check for duplicate IDs
    if (Array.isArray(report.findings)) {
      const ids = report.findings.map(f => f.id).filter(Boolean);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicates.length > 0) {
        errors.push(`Duplicate finding IDs: ${[...new Set(duplicates)].join(', ')}`);
      }
    }
    
    // Summary count check
    if (report.summary && Array.isArray(report.findings)) {
      if (report.summary.total_findings !== report.findings.length) {
        warnings.push(`total_findings (${report.summary.total_findings}) doesn't match actual findings count (${report.findings.length})`);
      }
    }
    
  } catch (e) {
    if (e.code === 'ENOENT') {
      errors.push(`File not found: ${reportPath}`);
    } else if (e instanceof SyntaxError) {
      errors.push(`Invalid JSON: ${e.message}`);
    } else {
      errors.push(`Error reading file: ${e.message}`);
    }
  }
  
  return { errors, warnings };
}

// Main
const reportPath = process.argv[2] || 'SECURITY_AUDIT.json';
const result = validateReport(reportPath);

console.log(`\nValidating: ${reportPath}\n`);

if (result.errors.length === 0 && result.warnings.length === 0) {
  console.log('✅ Report is valid');
  process.exit(0);
}

if (result.errors.length > 0) {
  console.log('❌ Errors:');
  result.errors.forEach(e => console.log(`  - ${e}`));
}

if (result.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  result.warnings.forEach(w => console.log(`  - ${w}`));
}

process.exit(result.errors.length > 0 ? 1 : 0);
