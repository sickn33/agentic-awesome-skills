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
    
    const epicKey = 'MAT-3839';
    const PROJECT_KEY = 'MAT';
    const TEAM_ID = '2e718a72-e69a-432d-bb09-6ec20981f67e';

    const filePath = path.resolve(__dirname, '../../../../Initiatives/1304_workflow_template/Workflow Template - Brock_tasks.json');
    const content = fs.readFileSync(filePath, 'utf8');
    const parsedData = JSON.parse(content);
    let tasks = [];
    
    parsedData.tasks.forEach((t, i) => {
        let deps = [];
        if (t.deps && t.deps.length > 0) {
            for (let d of t.deps) {
                let dTrimmed = d.trim();
                let m = dTrimmed.match(/^(?:-\s+|\d+\.\s+)(~~)?\\?\[(.*)/);
                if (m) {
                    let depTitle = m[2].trim().replace(/\\/g, '').replace(/~~$/, '').trim();
                    deps.push('[' + depTitle);
                } else {
                    let cleanD = dTrimmed.replace(/^(?:-\s+|\d+\.\s+)/, '').replace(/\\/g, '').trim();
                    if (cleanD && cleanD !== '\\-' && cleanD !== '-') deps.push(cleanD);
                }
            }
        }
        tasks.push({
            id: i + 1,
            summary: t.summary,
            description: t.description,
            sp: t.sp || 0,
            isDeleted: false,
            dependencyTitles: deps
        });
    });

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

    let targetTasks = tasks.filter(t => !t.isDeleted);
    console.log(`Found ${targetTasks.length} active tasks to create.`);

    let createdCount = 0;
    for (let task of targetTasks) {
        let payload = {
            fields: {
                project: { key: PROJECT_KEY },
                summary: task.summary,
                description: task.description,
                issuetype: { name: "Story" },
                customfield_10001: TEAM_ID,
                customfield_10014: epicKey,
                customfield_10031: task.sp
            }
        };

        try {
            const result = await requestJira('POST', '/rest/api/2/issue', payload);
            console.log(`Created Task ${task.id}: ${task.summary} -> ${result.key}`);
            task.key = result.key;
            createdCount++;
        } catch(e) {
            if (e.statusCode === 400 && e.response) {
                // fallback
                delete payload.fields.customfield_10014;
                payload.fields.parent = { key: epicKey };
                try {
                    const result2 = await requestJira('POST', '/rest/api/2/issue', payload);
                    console.log(`Created Task ${task.id} (fallback): ${task.summary} -> ${result2.key}`);
                    task.key = result2.key;
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

    console.log("Creating Issue Links...");
    let linkCount = 0;
    for (let task of targetTasks) {
        if (!task.key) continue;

        for (let depTitle of task.dependencyTitles) {
            let depTask = targetTasks.find(t => t.summary === depTitle);
            if (depTask && depTask.key) {
                let linkPayload = {
                    type: { name: "Blocks" },
                    inwardIssue: { key: depTask.key },
                    outwardIssue: { key: task.key }
                };
                try {
                    await requestJira('POST', '/rest/api/3/issueLink', linkPayload);
                    console.log(`Linked: ${depTask.key} blocks ${task.key}`);
                    linkCount++;
                } catch(e) {
                    console.log(`Failed to link ${depTask.key} to ${task.key}`, e.response || e);
                }
                await new Promise(r => setTimeout(r, 200));
            } else {
                console.log(`Warning: Dependency not found for title "${depTitle}" in task ${task.id}`);
            }
        }
    }
    console.log(`Successfully created ${linkCount} issue links.`);
}

main().catch(console.error);
