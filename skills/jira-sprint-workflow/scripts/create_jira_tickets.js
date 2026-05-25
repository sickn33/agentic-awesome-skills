const fs = require('fs');
const https = require('https');
const path = require('path');

async function main() {
    // Load env manually
    const envPath = path.resolve(__dirname, '../../../../.env');
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
    } catch(e) {
        console.error("Could not read .env", e.message);
        process.exit(1);
    }
    
    let emailMatch = envContent.match(/^JIRA_EMAIL=(.*)$/m);
    let tokenMatch = envContent.match(/^JIRA_API_TOKEN=(.*)$/m);
    
    if (!emailMatch || !tokenMatch) {
        console.error("JIRA_EMAIL or JIRA_API_TOKEN missing from .env");
        process.exit(1);
    }
    
    const JIRA_EMAIL = emailMatch[1].trim();
    const JIRA_API_TOKEN = tokenMatch[1].trim();
    const JIRA_DOMAIN = 'matchmade-io.atlassian.net';
    const PROJECT_KEY = 'MAT';
    const TEAM_ID = '2e718a72-e69a-432d-bb09-6ec20981f67e';

    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    
    function requestJira(method, endpoint, payload = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: JIRA_DOMAIN,
                path: endpoint,
                method: method,
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            const req = https.request(options, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    let parsed = data;
                    try { parsed = JSON.parse(data); } catch(e) {}
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject({statusCode: res.statusCode, response: parsed});
                    }
                });
            });
            req.on('error', err => reject(err));
            if (payload) {
                req.write(JSON.stringify(payload));
            }
            req.end();
        });
    }

    // Parse the sprint plan
    const filePath = path.resolve(__dirname, '../../../../Initiatives/1304_Billing/[Sprint-Planning][20260406] Company Billing.md');
    const content = fs.readFileSync(filePath, 'utf8');

    // Basic heuristic to capture main tasks which look like: "1. \[FUSION\] ..." or "1. [FUSION] ..."
    const lines = content.split('\n');
    let tasks = [];
    let currentTask = null;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let match = line.match(/^(\d+)\.\s+\\?\[(.*?)\]\s+(.*)/);
        
        if (match) {
            if (currentTask) tasks.push(currentTask);
            let tag = match[2].replace(/\\/g, '');
            let title = match[3].trim().replace(/\\/g, '');
            currentTask = {
                id: match[1],
                summary: `[${tag}] ${title}`,
                descriptionLines: []
            };
        } else if (currentTask) {
            // Include until next heading or empty chunk. Actually just collect all lines until next task
            if (line.match(/^\s*#+\s/) || line.includes('[image1]:')) {
                // Stop at headings with spaces or bottom reference links 
                break;
            }
            currentTask.descriptionLines.push(line);
        }
    }
    if (currentTask) {
        tasks.push(currentTask);
    }
    
    console.log(`Parsed ${tasks.length} tasks.`);
    if (tasks.length !== 50) {
        console.warn('Expected 50 tasks, found ' + tasks.length);
    }

    epicKey = 'MAT-3899';

    // CREATE TASKS
    let createdCount = 0;
    for (let task of tasks) {
        if (task.id !== '50') continue;
        // format description line by line
        // convert standard markdown to Jira Wiki markup
        let desc = task.descriptionLines.join('\n')
            .replace(/## /g, 'h2. ')
            .replace(/### /g, 'h3. ');

        let payload = {
            fields: {
                project: { key: PROJECT_KEY },
                summary: task.summary,
                description: desc,
                issuetype: { name: "Story" },
                customfield_10001: TEAM_ID
            }
        };

        // For attaching to parent Epic in older v2 cloud Jira
        // usually it's customfield_10014 for Epic Link, OR "parent" field.
        // We'll try "parent" field first, if it fails, we fall back to customfield_10014
        payload.fields.parent = { key: epicKey };
        
        try {
            const result = await requestJira('POST', '/rest/api/2/issue', payload);
            console.log(`Created Task ${task.id}: ${task.summary} -> ${result.key}`);
            createdCount++;
        } catch(e) {
            if (e.statusCode === 400 && e.response && e.response.errors && e.response.errors.parent) {
                // If 'parent' is invalid, fall back to Jira's Epic Link custom field
                delete payload.fields.parent;
                payload.fields.customfield_10014 = epicKey;
                try {
                    const result2 = await requestJira('POST', '/rest/api/2/issue', payload);
                    console.log(`Created Task ${task.id} (fallback Epic Link): ${task.summary} -> ${result2.key}`);
                    createdCount++;
                } catch(e2) {
                    console.error(`Failed to create task ${task.id}`, e2);
                }
            } else {
                console.error(`Failed to create task ${task.id}`, e);
            }
        }
        
        // Wait a little to avoid rate limits
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`Successfully created ${createdCount} / ${tasks.length} Jira tickets under Epic ${epicKey}.`);
}

main().catch(console.error);
