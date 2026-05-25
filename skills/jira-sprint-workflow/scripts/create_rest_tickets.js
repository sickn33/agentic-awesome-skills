const https = require('https');
const fs = require('fs');
const path = require('path');

async function main() {
    const envPath = path.resolve(__dirname, '../../../../.env');
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
    } catch(e) {
        console.error("Could not read .env", e);
        process.exit(1);
    }
    
    let emailMatch = envContent.match(/^JIRA_EMAIL=(.*)$/m);
    let tokenMatch = envContent.match(/^JIRA_API_TOKEN=(.*)$/m);
    const JIRA_EMAIL = emailMatch[1].trim();
    const JIRA_API_TOKEN = tokenMatch[1].trim();
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    
    const epicKey = 'MAT-3899';
    const PROJECT_KEY = 'MAT';
    const TEAM_ID = '2e718a72-e69a-432d-bb09-6ec20981f67e';

    const filePath = path.resolve(__dirname, '../../../../Initiatives/1304_Billing/[Sprint-Planning][20260406] Company Billing.md');
    const content = fs.readFileSync(filePath, 'utf8');
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
                id: parseInt(match[1]),
                summary: `[${tag}] ${title}`,
                descriptionLines: []
            };
        } else if (currentTask) {
            if (line.includes('SP Resolve') || line.includes('Environment Variables') || line.includes('[image1]:')) {
                break;
            }
            currentTask.descriptionLines.push(line);
        }
    }
    if (currentTask) tasks.push(currentTask);

    function requestJira(method, endpoint, payload = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'matchmade-io.atlassian.net',
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
            if (payload) req.write(JSON.stringify(payload));
            req.end();
        });
    }

    // Skip Task 1 as it was created as a test
    let targetTasks = tasks.filter(t => t.id >= 3 && t.id <= 50);
    console.log(`Processing ${targetTasks.length} tasks...`);

    let createdCount = 0;
    for (let task of targetTasks) {
        let formattedLines = [];
        for (let line of task.descriptionLines) {
            line = line.replace(/\r/g, '').trimEnd();
            if (!line.trim()) {
                continue; // Skip empty lines, we inject our own for lists
            }
            
            let leadingSpacesMatch = line.match(/^(\s*)(?:\d+\. |[-*] )(.*)/);
            if (leadingSpacesMatch) {
                let spaces = leadingSpacesMatch[1].length;
                let text = leadingSpacesMatch[2].trim();
                
                if (spaces === 3) {
                    let colonIdx = text.indexOf(':');
                    if (colonIdx !== -1) {
                        let headerText = text.substring(0, colonIdx).trim();
                        let restText = text.substring(colonIdx + 1).trim();
                        formattedLines.push(`\nh3. ${headerText}`); // \n breaks Jira list numbering!
                        if (restText) {
                            formattedLines.push(restText);
                        }
                    } else {
                        formattedLines.push(`\nh3. ${text}`);
                    }
                } else if (spaces === 6) {
                    formattedLines.push(`# ${text}`);
                } else if (spaces >= 9) {
                    formattedLines.push(`## ${text}`);
                } else {
                    formattedLines.push(line);
                }
            } else {
                 formattedLines.push(line.trim());
            }
        }
        let desc = formattedLines.join('\n').trim();

        let payload = {
            fields: {
                project: { key: PROJECT_KEY },
                summary: task.summary,
                description: desc,
                issuetype: { name: "Story" },
                customfield_10001: TEAM_ID,
                customfield_10014: epicKey
            }
        };

        try {
            const result = await requestJira('POST', '/rest/api/2/issue', payload);
            console.log(`Created Task ${task.id}: ${task.summary} -> ${result.key}`);
            createdCount++;
        } catch(e) {
            if (e.statusCode === 400 && e.response) {
                // fallback
                delete payload.fields.customfield_10014;
                payload.fields.parent = { key: epicKey };
                try {
                    const result2 = await requestJira('POST', '/rest/api/2/issue', payload);
                    console.log(`Created Task ${task.id} (fallback): ${task.summary} -> ${result2.key}`);
                    createdCount++;
                } catch(e2) {
                    console.error(`Failed to create task ${task.id}`, e2);
                }
            } else {
                console.error(`Failed to create task ${task.id}`, e);
            }
        }
        await new Promise(r => setTimeout(r, 200));
    }

    console.log(`Successfully completed! Created ${createdCount} / ${targetTasks.length} tickets.`);
}

main().catch(console.error);
