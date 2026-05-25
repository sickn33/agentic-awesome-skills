#!/usr/bin/env node

/**
 * Map Story Points from Sprint Plan to Jira Tickets
 * 
 * This script matches parsed tickets with Jira search results and generates
 * story point update mappings.
 * 
 * Usage:
 *   node map_story_points.js --jira-data <path_to_jira_search_results.json> --input parsed_sprint_tasks.json
 *   node map_story_points.js --jira-data jira_search.json --output sp_updates.json
 * 
 * If --jira-data is not provided, reads from stdin or uses MCP tools to fetch.
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const jiraDataPath = args[args.indexOf('--jira-data') + 1];
const outputPath = args[args.indexOf('--output') + 1] || path.join(__dirname, 'sp_updates.json');

try {
    // Read parsed tickets
    const ticketsPath = args.indexOf('--input') > -1 ? args[args.indexOf('--input') + 1] : path.join(__dirname, 'parsed_sprint_tasks.json');

    if (!fs.existsSync(ticketsPath)) {
        console.error(`❌ Error: Input file not found: ${ticketsPath}`);
        console.error('Run robust_parse_sprint.js first or specify --input <file>');
        process.exit(1);
    }

    const ticketsData = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
    const tasks = ticketsData.tasks || ticketsData.stories || [];

    // Map of Summary -> SP
    const summaryToSP = {};

    // Helper to clean summary
    function cleanSummary(s) {
        if (!s) return '';
        return s.replace(/\\\[/g, '[').replace(/\\\]/g, ']').replace(/\\-/g, '-').trim();
    }

    tasks.forEach(ticket => {
        // Look for SP in ticket property or description
        let sp = ticket.story_points || ticket.sp;
        if (!sp && ticket.description) {
            const spMatch = ticket.description.match(/SP:\s*(\d+)/i);
            if (spMatch) sp = parseInt(spMatch[1], 10);
        }

        if (sp) {
            summaryToSP[cleanSummary(ticket.summary)] = sp;
        }
    });

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
            console.error('Usage: node map_story_points.js --jira-data <path_to_jira_search.json>');
            process.exit(1);
        }
    }

    const updates = [];
    const summaryToKey = {};
    if (jiraData.issues && Array.isArray(jiraData.issues)) {
        jiraData.issues.forEach(issue => {
            // Jira summaries are already clean
            summaryToKey[issue.fields.summary.trim()] = issue.key;
        });
    }

    console.log("--- Matching Process ---");

    tasks.forEach(ticket => {
        const originalSummary = ticket.summary;
        const cleanedSummary = cleanSummary(originalSummary);
        const key = summaryToKey[cleanedSummary];

        if (key) {
            let sp = summaryToSP[cleanedSummary];
            // Handle TBD or non-numeric
            if (String(sp).toUpperCase() === 'TBD' || sp === null || sp === undefined) {
                console.log(`Skipping TBD/Null SP for ${key} ("${cleanedSummary}"): ${sp}`);
            } else {
                // Parse as number
                const spNum = parseFloat(sp);
                if (!isNaN(spNum)) {
                    updates.push({
                        key: key,
                        sp: spNum
                    });
                } else {
                    console.log(`Invalid SP for ${key} ("${cleanedSummary}"): ${sp}`);
                }
            }
        } else {
            // console.log(`No match for: "${cleanedSummary}"`);
        }
    });

    console.log(`\nTotal updates generated: ${updates.length}`);
    fs.writeFileSync(outputPath, JSON.stringify(updates, null, 2));

} catch (err) {
    console.error('Error:', err);
}
