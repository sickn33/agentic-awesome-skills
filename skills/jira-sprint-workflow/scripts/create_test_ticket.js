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
                id: match[1],
                summary: `[${tag}] ${title}`,
                descriptionLines: []
            };
        } else if (currentTask) {
            if (line.match(/^\s*#+\s/) || line.includes('[image1]:')) {
                break;
            }
            currentTask.descriptionLines.push(line);
        }
    }
    if (currentTask) tasks.push(currentTask);
    
    let task = tasks.find(t => t.id === '1');
    if (!task) {
        console.log("Task 1 not found"); return;
    }

    let formattedLines = [];
    for (let line of task.descriptionLines) {
        line = line.replace(/\r/g, '').trimEnd();
        if (!line.trim()) {
            continue; // Skip empty lines for cleaner output
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
                    formattedLines.push(`h3. ${headerText}`);
                    if (restText) {
                        formattedLines.push(restText);
                    }
                } else {
                    formattedLines.push(`h3. ${text}`);
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
    let desc = formattedLines.join('\n');

    console.log("== Description to send ==\n" + desc);

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

    const options = {
        hostname: 'matchmade-io.atlassian.net',
        path: '/rest/api/2/issue',
        method: 'POST',
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
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log("Successfully created Task 1: ", data);
            } else if (res.statusCode === 400 && data.includes('customfield_10014')) {
               // Fallback
               delete payload.fields.customfield_10014;
               payload.fields.parent = { key: epicKey };
               const req2 = https.request(options, res2 => {
                   let d2 = '';
                   res2.on('data', c => d2 += c);
                   res2.on('end', () => console.log('Response:', d2));
               });
               req2.write(JSON.stringify(payload)); req2.end();
            } else {
                console.error("Failed to create Task 1:", data);
            }
        });
    });
    req.write(JSON.stringify(payload));
    req.end();
}
main().catch(console.error);
