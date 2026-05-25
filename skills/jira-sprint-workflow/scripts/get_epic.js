const https = require('https');
require('dotenv').config();
const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');

function requestJira(method, endpoint) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'matchmade-io.atlassian.net',
            path: endpoint,
            method: method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Accept': 'application/json'
            }
        };
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    let jql = encodeURIComponent('summary ~ "[20260413] Workflow Template" AND issuetype = Epic');
    let res = await requestJira('GET', `/rest/api/2/search?jql=${jql}`);
    console.log(JSON.stringify(res.issues.map(i => ({key: i.key, summary: i.fields.summary}))));
}
main();
