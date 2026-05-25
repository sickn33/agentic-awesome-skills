#!/usr/bin/env node

/**
 * Compare Jira Tickets with Sprint Planning Document
 * 
 * This script compares existing Jira tickets with a sprint planning markdown file
 * to identify discrepancies in story points, descriptions, and issue links.
 * 
 * Usage:
 *   node compare_tickets.js --epic MAT-3540 --sprint-plan "path/to/sprint-plan.md"
 *   node compare_tickets.js --jql "project=MAT AND sprint='Sprint 1'" --sprint-plan "path/to/sprint-plan.md"
 */

const https = require('https');
const fs = require('path');
const path = require('path');

// Load .env file from project root
const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

// Jira Configuration
const JIRA_DOMAIN = 'matchmade-io.atlassian.net';
const CLOUD_ID = 'baa647e2-8cd8-468b-99ba-afc8198f5f62';
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

// Parse command line arguments
const args = process.argv.slice(2);
const epicKey = args.find((arg, i) => arg === '--epic' && args[i + 1])?.match(/--epic\s+(\S+)/)?.[1] ||
    args[args.indexOf('--epic') + 1];
const jql = args.find((arg, i) => arg === '--jql' && args[i + 1])?.match(/--jql\s+"([^"]+)"/)?.[1] ||
    args[args.indexOf('--jql') + 1];
const sprintPlanPath = args.find((arg, i) => arg === '--sprint-plan' && args[i + 1])?.match(/--sprint-plan\s+"?([^"]+)"?/)?.[1] ||
    args[args.indexOf('--sprint-plan') + 1];

if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
    console.error('❌ Error: JIRA credentials not found in .env file');
    process.exit(1);
}

if (!sprintPlanPath) {
    console.error('❌ Error: Sprint plan path is required');
    console.error('Usage: node compare_tickets.js --epic MAT-XXXX --sprint-plan "path/to/file.md"');
    process.exit(1);
}

/**
 * Make authenticated request to Jira API
 */
function makeJiraRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

        const options = {
            hostname: JIRA_DOMAIN,
            path: path,
            method: method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => { responseData += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(responseData ? JSON.parse(responseData) : null);
                } else {
                    reject({ statusCode: res.statusCode, error: responseData });
                }
            });
        });

        req.on('error', (error) => reject({ error: error.message }));
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

/**
 * Fetch Jira tickets by Epic or JQL
 */
async function fetchJiraTickets() {
    let query;
    if (epicKey) {
        query = `parent = ${epicKey}`;
    } else if (jql) {
        query = jql;
    } else {
        throw new Error('Either --epic or --jql must be provided');
    }

    const encodedJql = encodeURIComponent(query);
    const path = `/rest/api/3/search?jql=${encodedJql}&fields=summary,customfield_10031,description,issuelinks&maxResults=100`;

    const response = await makeJiraRequest('GET', path);
    return response.issues;
}

/**
 * Parse sprint planning document for expected values
 */
function parseSprintPlan(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const tickets = [];

    // Simple regex-based parsing (this should match parse_sprint_plan.js logic)
    const taskRegex = /^\d+\.\s+\[([^\]]+)\]\s+(.*?)$/gm;
    const spRegex = /SP\s*:\s*(\d+)/i;

    let match;
    while ((match = taskRegex.exec(content)) !== null) {
        const summary = `[${match[1]}] ${match[2]}`.trim();
        const taskStart = match.index;
        const nextTask = taskRegex.exec(content);
        const taskEnd = nextTask ? nextTask.index : content.length;
        taskRegex.lastIndex = taskStart + 1; // Reset for next iteration

        const taskContent = content.substring(taskStart, taskEnd);
        const spMatch = spRegex.exec(taskContent);
        const storyPoints = spMatch ? parseInt(spMatch[1]) : null;

        tickets.push({ summary, storyPoints });
    }

    return tickets;
}

/**
 * Compare actual vs expected tickets
 */
function compareTickets(jiraTickets, expectedTickets) {
    const discrepancies = [];
    const comparison = {
        total: jiraTickets.length,
        matched: 0,
        storyPointMismatches: 0,
        missingTickets: 0,
        extraTickets: 0
    };

    // Create lookup by summary
    const jiraBySum = {};
    jiraTickets.forEach(t => jiraBySum[t.fields.summary.trim()] = t);

    const expectedBySum = {};
    expectedTickets.forEach(t => expectedBySum[t.summary] = t);

    // Check for matches and SP discrepancies
    expectedTickets.forEach(expected => {
        const jiraTicket = jiraBySum[expected.summary];
        if (!jiraTicket) {
            discrepancies.push({
                type: 'MISSING',
                summary: expected.summary,
                expected: expected.storyPoints
            });
            comparison.missingTickets++;
        } else {
            const actualSP = jiraTicket.fields.customfield_10031;
            if (actualSP !== expected.storyPoints) {
                discrepancies.push({
                    type: 'SP_MISMATCH',
                    key: jiraTicket.key,
                    summary: expected.summary,
                    expected: expected.storyPoints,
                    actual: actualSP
                });
                comparison.storyPointMismatches++;
            } else {
                comparison.matched++;
            }
        }
    });

    // Check for extra tickets
    jiraTickets.forEach(jira => {
        if (!expectedBySum[jira.fields.summary.trim()]) {
            discrepancies.push({
                type: 'EXTRA',
                key: jira.key,
                summary: jira.fields.summary
            });
            comparison.extraTickets++;
        }
    });

    return { discrepancies, comparison };
}

/**
 * Main function
 */
async function main() {
    console.log('🔍 Comparing Jira Tickets with Sprint Planning Document\\n');

    try {
        console.log('📥 Fetching Jira tickets...');
        const jiraTickets = await fetchJiraTickets();
        console.log(`   Found ${jiraTickets.length} tickets\\n`);

        console.log('📄 Parsing sprint planning document...');
        const expectedTickets = parseSprintPlan(sprintPlanPath);
        console.log(`   Found ${expectedTickets.length} tasks\\n`);

        console.log('🔎 Comparing...\\n');
        const { discrepancies, comparison } = compareTickets(jiraTickets, expectedTickets);

        // Display results
        console.log('='.repeat(70));
        console.log('📊 COMPARISON SUMMARY');
        console.log('='.repeat(70));
        console.log(`Total Jira Tickets:        ${comparison.total}`);
        console.log(`Matching Tickets:          ${comparison.matched} ✅`);
        console.log(`Story Point Mismatches:    ${comparison.storyPointMismatches}`);
        console.log(`Missing from Jira:         ${comparison.missingTickets}`);
        console.log(`Extra in Jira:             ${comparison.extraTickets}`);

        if (discrepancies.length > 0) {
            console.log('\\n' + '='.repeat(70));
            console.log('⚠️  DISCREPANCIES FOUND');
            console.log('='.repeat(70));

            discrepancies.forEach((disc, idx) => {
                console.log(`\\n${idx + 1}. ${disc.type}:`);
                console.log(`   ${disc.key || ''} ${disc.summary}`);
                if (disc.type === 'SP_MISMATCH') {
                    console.log(`   Expected SP: ${disc.expected}, Actual SP: ${disc.actual}`);
                }
            });
        } else {
            console.log('\\n✅ All tickets match! No discrepancies found.');
        }

        // Output JSON for agent processing
        fs.writeFileSync('comparison_results.json', JSON.stringify({ discrepancies, comparison }, null, 2));
        console.log('\\n💾 Detailed results saved to comparison_results.json');

    } catch (error) {
        console.error('❌ Error:', error.message || error);
        process.exit(1);
    }
}

main();
