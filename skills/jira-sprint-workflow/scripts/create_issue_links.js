#!/usr/bin/env node

/**
 * Create Jira Issue Links for Sprint Tickets
 * 
 * This script creates dependency links between Jira tickets based on the
 * configuration file or command-line arguments.
 * 
 * Link Types:
 * - "Blocks" / "is blocked by" - for backend APIs that frontend depends on
 * - "Relates to" - for FUSION endpoints that call RELAY endpoints
 * 
 * Usage:
 *   node create_issue_links.js --config issue_links_sprint1.json
 *   node create_issue_links.js --links '[{"inward":"MAT-1","outward":"MAT-2","type":"Relates"}]'
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

// Load .env file from project root
const envPath = path.resolve(__dirname, '../../../.env');
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    console.warn('⚠️  .env file not found, using environment variables');
}

// Jira Configuration
const JIRA_DOMAIN = 'matchmade-io.atlassian.net';
const CLOUD_ID = 'baa647e2-8cd8-468b-99ba-afc8198f5f62';

// Load credentials from .env file or environment variables
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

if (!JIRA_EMAIL || !JIRA_API_TOKEN) {
    console.error('❌ Error: JIRA_EMAIL and JIRA_API_TOKEN must be set in .env file or environment variables');
    console.error('\nCreate a .env file in the project root with:');
    console.error('  JIRA_EMAIL=your-email@example.com');
    console.error('  JIRA_API_TOKEN=your-api-token');
    console.error('\nGet API token from: https://id.atlassian.com/manage-profile/security/api-tokens');
    process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const configPath = args[args.indexOf('--config') + 1];
const linksArg = args[args.indexOf('--links') + 1];

// Load issue links from config file or command line
let issueLinks = [];

if (linksArg) {
    try {
        issueLinks = JSON.parse(linksArg);
    } catch (e) {
        console.error('❌ Error: Invalid JSON in --links argument');
        process.exit(1);
    }
} else if (configPath) {
    const fullPath = path.resolve(configPath);
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Error: Config file not found: ${fullPath}`);
        process.exit(1);
    }
    try {
        const config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        issueLinks = config.links || [];
    } catch (e) {
        console.error(`❌ Error: Invalid JSON in config file: ${fullPath}`);
        process.exit(1);
    }
} else {
    // Look for default issue_links.json in scripts directory
    const defaultPath = path.join(__dirname, 'issue_links.json');
    if (fs.existsSync(defaultPath)) {
        const config = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
        issueLinks = config.links || [];
    } else {
        console.error('❌ Error: No issue links provided.');
        console.error('\nUsage:');
        console.error('  node create_issue_links.js --config issue_links_sprint1.json');
        console.error('  node create_issue_links.js --links \'[{"inward":"MAT-1","outward":"MAT-2","type":"Relates"}]\'');
        console.error('\nOr create issue_links.json in the scripts directory.');
        process.exit(1);
    }
}

if (issueLinks.length === 0) {
    console.error('❌ Error: No issue links found in configuration.');
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

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                        statusCode: res.statusCode,
                        data: responseData ? JSON.parse(responseData) : null
                    });
                } else {
                    reject({
                        statusCode: res.statusCode,
                        error: responseData
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject({ error: error.message });
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * Create a single issue link
 */
async function createIssueLink(link) {
    const { inward, outward, type, comment } = link;

    // Jira API payload structure
    const payload = {
        type: {
            name: type
        },
        inwardIssue: {
            key: inward
        },
        outwardIssue: {
            key: outward
        }
    };

    try {
        await makeJiraRequest('POST', '/rest/api/3/issueLink', payload);
        console.log(`✅ Created link: ${outward} ${type.toLowerCase()} ${inward}`);
        return { success: true, link };
    } catch (error) {
        // Check if link already exists (409 Conflict)
        if (error.statusCode === 409) {
            console.log(`ℹ️  Link already exists: ${outward} ${type.toLowerCase()} ${inward}`);
            return { success: true, link, alreadyExists: true };
        } else {
            console.error(`❌ Failed to create link: ${outward} → ${inward}`);
            console.error(`   Error: ${error.error || error.statusCode}`);
            return { success: false, link, error };
        }
    }
}

/**
 * Create all issue links with progress tracking
 */
async function createAllIssueLinks() {
    console.log('🔗 Creating Jira Issue Links');
    console.log(`📊 Total links to create: ${issueLinks.length}\n`);

    const results = {
        created: 0,
        alreadyExists: 0,
        failed: 0,
        errors: []
    };

    for (let i = 0; i < issueLinks.length; i++) {
        const link = issueLinks[i];
        console.log(`[${i + 1}/${issueLinks.length}] Processing...`);

        const result = await createIssueLink(link);

        if (result.success) {
            if (result.alreadyExists) {
                results.alreadyExists++;
            } else {
                results.created++;
            }
        } else {
            results.failed++;
            results.errors.push(result);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${results.created}`);
    console.log(`ℹ️  Already existed: ${results.alreadyExists}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Total processed: ${issueLinks.length}`);

    if (results.failed > 0) {
        console.log('\n⚠️  Errors encountered:');
        results.errors.forEach((err, idx) => {
            console.log(`  ${idx + 1}. ${err.link.outward} → ${err.link.inward}`);
            console.log(`     ${err.error}`);
        });
    }

    console.log('\n✨ Done!');
}

// Run the script
createAllIssueLinks().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});
