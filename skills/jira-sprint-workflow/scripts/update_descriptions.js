#!/usr/bin/env node

/**
 * Generate Description Updates for Jira Tickets
 * 
 * This script matches parsed tickets with Jira search results and generates
 * description update mappings for bulk updates.
 * 
 * Usage:
 *   node update_descriptions.js --jira-data <path_to_jira_search_results.json>
 *   node update_descriptions.js --jira-data jira_search.json --output description_updates.json
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const jiraDataIndex = args.indexOf('--jira-data');
const jiraDataPath = jiraDataIndex > -1 ? args[jiraDataIndex + 1] : null;

const outputIndex = args.indexOf('--output');
const outputPath = outputIndex > -1 ? args[outputIndex + 1] : path.join(__dirname, 'description_updates.json');

// Read parsed tickets
const ticketsPath = args.indexOf('--input') > -1 ? args[args.indexOf('--input') + 1] : path.join(__dirname, 'parsed_sprint_tasks.json');

let effectiveTicketsPath = ticketsPath;
if (!fs.existsSync(ticketsPath)) {
    const legacyPath = path.join(__dirname, 'parsed_tickets.json');
    if (fs.existsSync(legacyPath) && args.indexOf('--input') === -1) {
        effectiveTicketsPath = legacyPath;
        console.log(`Using legacy input file: ${legacyPath}`);
    } else {
        console.error(`❌ Error: Input file not found: ${ticketsPath}`);
        console.error('Run robust_parse_sprint.js first or specify --input <file>');
        process.exit(1);
    }
}

const ticketsData = JSON.parse(fs.readFileSync(effectiveTicketsPath, 'utf8'));
const tasks = ticketsData.tasks || ticketsData.stories || [];

// Load Jira data from file or use MCP-fetched data
let jiraData;
if (jiraDataPath && fs.existsSync(jiraDataPath)) {
    jiraData = JSON.parse(fs.readFileSync(jiraDataPath, 'utf8'));
} else {
    // Check for default jira_search.json in scripts directory
    const defaultPath = path.join(__dirname, 'jira_search.json');
    if (fs.existsSync(defaultPath)) {
        jiraData = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
    } else {
        console.error('❌ Error: Jira search data not provided.');
        console.error('Usage: node update_descriptions.js --jira-data <path_to_jira_search.json>');
        console.error('   Or: Place jira_search.json in the scripts directory');
        process.exit(1);
    }
}

// Create mapping of summary to Jira key
const summaryToKey = {};
const issues = Array.isArray(jiraData.issues) ? jiraData.issues : (jiraData.issues && Array.isArray(jiraData.issues.nodes)) ? jiraData.issues.nodes : [];

// Helper function to clean summary
function cleanSummary(summary) {
    if (!summary) return '';
    return summary
        .replace(/^\d+\.\s*/, '')       // Remove leading numbers
        .replace(/^[-*]\s*/, '')         // Remove leading bullets
        .replace(/\[REACT\]\s*/gi, '[REACT] ')
        .replace(/\[FUSION\]\s*/gi, '[FUSION] ')
        .trim();
}

if (issues.length > 0) {
    issues.forEach(issue => {
        summaryToKey[cleanSummary(issue.fields.summary)] = issue.key;
    });
}

// Helper function to format description for Jira using Markdown
function formatDescriptionForJira(desc) {
    if (!desc) return '';
    let formatted = desc;
    // Ensure blank line before headings
    formatted = formatted.replace(/^(#{1,3}\s)/gm, '\n$1');
    // Clean up multiple blank lines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    return formatted.trim();
}

// Generate updates
const updates = [];
const specificKey = args.indexOf('--key') > -1 ? args[args.indexOf('--key') + 1] : null;

tasks.forEach(ticket => {
    const cleanedSummary = cleanSummary(ticket.summary);
    const key = summaryToKey[cleanedSummary];

    if (key) {
        // Filter if specific key requested
        if (specificKey && key !== specificKey) {
            return;
        }

        const formattedDesc = formatDescriptionForJira(ticket.description);
        updates.push({
            key: key,
            description: formattedDesc
        });
        console.log(`✓ Matched: ${key} - "${cleanedSummary}"`);
    } else {
        if (!specificKey) { // Only show errors if not filtering
            console.log(`✗ No match for: "${cleanedSummary}"`);
        }
    }
});

console.log(`\nTotal updates generated: ${updates.length}`);

// Save to file
fs.writeFileSync(outputPath, JSON.stringify(updates, null, 2));

console.log(`Saved to ${outputPath}`);
