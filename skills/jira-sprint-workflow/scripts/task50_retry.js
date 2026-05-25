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
    
    // Epic Key created earlier
    const epicKey = 'MAT-3899';
    const PROJECT_KEY = 'MAT';
    const TEAM_ID = '2e718a72-e69a-432d-bb09-6ec20981f67e'; // Brock Team

    let payload = {
        fields: {
            project: { key: PROJECT_KEY },
            summary: "[Reactor] Edit Worker Add Tag field",
            description: "h2. Todo\n# add an option for billable value\n# integration\n\nh2. AC:\n# There is a field to set billable tag value\n\nh2. Deps:\n# -",
            issuetype: { name: "Story" },
            customfield_10001: TEAM_ID,
            parent: { key: epicKey } // Attach to epic
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
                console.log("Successfully created Task 50: MAT-3949. Response:", data);
            } else if (res.statusCode === 400) {
                // If 'parent' is unsupported, fallback to epic link field
                delete payload.fields.parent;
                payload.fields.customfield_10014 = epicKey;
                const req2 = https.request(options, res2 => {
                    let d = '';
                    res2.on('data', c => d += c);
                    res2.on('end', () => {
                        console.log("Fallback response:", res2.statusCode, d);
                    });
                });
                req2.write(JSON.stringify(payload));
                req2.end();
            } else {
                console.error("Failed to create Task 50:", data);
            }
        });
    });
    req.write(JSON.stringify(payload));
    req.end();
}
main().catch(console.error);
