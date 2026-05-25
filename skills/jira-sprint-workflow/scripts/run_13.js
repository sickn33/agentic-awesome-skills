const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

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

async function main() {
    const filePath = path.resolve(__dirname, '../../../../Initiatives/1304_Billing/[Sprint-Planning][20260406] Company Billing - sprint2_tasks.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const t = data.tasks[12];
    
    let payload = {
        fields: {
            project: { key: 'MAT' },
            summary: t.summary,
            description: t.description,
            issuetype: { name: "Story" },
            customfield_10001: '2e718a72-e69a-432d-bb09-6ec20981f67e',
            customfield_10014: 'MAT-3899',
            customfield_10031: t.sp || 0
        }
    };
    
    try {
        const result = await requestJira('POST', '/rest/api/2/issue', payload);
        console.log(`Created Task 13: ${t.summary} -> ${result.key}`);
        
        // Link to MAT-4187 and MAT-4186
        for (let outward of ['MAT-4187', 'MAT-4186']) {
            let linkPayload = {
                type: { name: "Blocks" },
                inwardIssue: { key: outward }, 
                outwardIssue: { key: result.key } 
            };
            await requestJira('POST', '/rest/api/3/issueLink', linkPayload);
            console.log(`Linked: ${outward} blocks ${result.key}`);
        }
    } catch(e) {
        console.error('Failed', e.response || e);
    }
}
main();
