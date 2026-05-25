const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });
const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

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

async function link(inward, outward) {
    let linkPayload = {
        type: { name: "Blocks" },
        inwardIssue: { key: inward }, 
        outwardIssue: { key: outward } 
    };
    try {
        await requestJira('POST', '/rest/api/3/issueLink', linkPayload);
        console.log(`Linked: ${inward} blocks ${outward}`);
    } catch(e) {
        console.error('Failed', e.response || e);
    }
}

async function main() {
    await link('MAT-4183', 'MAT-4184'); // Task 8 blocks Task 9
    await link('MAT-4176', 'MAT-4185'); // Task 1 blocks Task 10
}
main();
