const fs = require('fs');
const path = require('path');

// Usage: node generate_sprint_links.js <parsed_tasks.json> <jira_csv_or_json> [output.json]

const tasksFile = process.argv[2];
const jiraFile = process.argv[3];

if (!tasksFile || !jiraFile) {
    console.log("Usage: node generate_sprint_links.js <parsed_tasks.json> <jira_csv_or_json> [output.json]");
    process.exit(1);
}

// Default output to the same directory as input
const defaultOutput = path.join(path.dirname(tasksFile), 'issue_links_sprint_dependency.json');
const outputFile = process.argv[4] || defaultOutput;

console.log(`Reading tasks from: ${tasksFile}`);
console.log(`Reading jira data from: ${jiraFile}`);
console.log(`Writing links to: ${outputFile}`);

try {
    // Load files
    const refinedData = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));

    // Support both raw JSON from JIRA API and the simple text format we might have used
    let jiraIssues = [];
    const jiraData = JSON.parse(fs.readFileSync(jiraFile, 'utf8'));
    if (Array.isArray(jiraData)) {
        // Assume it's a direct array of issues (e.g., from a simplified export)
        jiraIssues = jiraData;
    } else if (jiraData.issues && Array.isArray(jiraData.issues)) {
        // Assume it's a standard JIRA API response structure
        jiraIssues = jiraData.issues;
    } else {
        console.error("Error: Jira data file does not contain a valid array of issues.");
        process.exit(1);
    }

    // Matching Logic (3x Retry / Fallback):
    // 1. Exact Match (Normalized): Check if task summary matches Jira summary exactly after normalization.
    // 2. Manual Overrides: Check if there's a predefined mapping for this task/dependency.
    // 3. Fuzzy/Contains Match: Check if one string contains the other.
    // If all fail, skip and log warning.

    // Normalization function
    const normalize = (str) => {
        if (!str) return '';
        return str
            .replace(/\[[^\]]+\]/g, '') // Remove tags like [FUSION]
            .replace(/\\/g, '') // Remove backslashes
            .replace(/–/g, '-') // Replace en-dash with hyphen
            .replace(/—/g, '-') // Replace em-dash with hyphen
            .replace(/\s+/g, ' ') // Collapse whitespace
            .trim()
            .toLowerCase(); // Case insensitive
    };

    // Create map of normalized summary -> key
    // And list of { normalized, key } for fuzzy search
    const summaryToKey = {};
    const issueList = [];

    // Manual overrides for specific text mismatches (normalized)
    const manualOverrides = {
        'force verify firebase account emails': 'verify emails firebase'
    };

    jiraIssues.forEach(issue => {
        if (issue.fields && issue.fields.summary) {
            const norm = normalize(issue.fields.summary);
            summaryToKey[norm] = issue.key;
            issueList.push({ norm, key: issue.key, summary: issue.fields.summary });
        }
    });

    const links = [];
    const missingKeys = [];

    refinedData.tasks.forEach(task => {
        // Find Task Key
        const taskSummary = task.original_summary ? task.original_summary : task.summary;
        const normTask = normalize(taskSummary);
        let taskKey = summaryToKey[normTask];

        if (!taskKey) {
            // Try fuzzy find for task
            const matches = issueList.filter(i => i.norm.includes(normTask) || normTask.includes(i.norm));
            if (matches.length === 1) {
                taskKey = matches[0].key;
            } else if (matches.length > 1) {
                console.warn(`Ambiguous match for task: "${taskSummary}" -> Found ${matches.length} candidates.`);
                // specific override for "Generate OTP endpoint"? logic handled in deps usually
            }
        }

        if (!taskKey) {
            console.warn(`Warning: No Jira issue found for task: "${taskSummary}" (Normalized: "${normTask}")`);
            missingKeys.push(taskSummary);
            return;
        }

        if (task.extracted_deps && task.extracted_deps.length > 0) {
            task.extracted_deps.forEach(dep => {
                const normDep = normalize(dep);
                let depKey = summaryToKey[normDep];

                if (!depKey) {
                    // Manual Override Check
                    if (manualOverrides[normDep]) {
                        const overrideDep = manualOverrides[normDep];
                        depKey = summaryToKey[overrideDep] || issueList.find(i => i.norm === overrideDep)?.key;
                        if (depKey) console.log(`  Applying Manual Override: "${dep}" -> ${depKey}`);
                    }
                }

                if (!depKey) {
                    // Fuzzy match
                    const matches = issueList.filter(i => i.norm.includes(normDep) || normDep.includes(i.norm));
                    if (matches.length === 1) {
                        depKey = matches[0].key;
                    } else if (matches.length > 1) {
                        // Handle ambiguity
                        // If "generate otp endpoint", prefer "email"
                        if (normDep.includes('generate otp endpoint')) {
                            const emailMatch = matches.find(m => m.norm.includes('email'));
                            if (emailMatch) depKey = emailMatch.key;
                        }

                        if (!depKey) {
                            console.warn(`Ambiguous match for dep: "${dep}" -> ${matches.map(m => m.key).join(', ')}`);
                        }
                    }
                }

                if (!depKey) {
                    console.warn(`  Warning: No Jira issue found for dependency: "${dep}" (on task ${taskKey})`);
                    missingKeys.push(dep);
                } else {
                    // User requested swap:
                    // Previous: Inward=Task, Outward=Dep (Task is blocked by Dep)
                    // Current Fix: Inward=Dep, Outward=Task (Dep blocks Task - assuming Inward=Blocks config)
                    links.push({
                        inward: depKey,
                        outward: taskKey,
                        type: "Blocks"
                    });
                }
            });
        }
    });

    console.log(`Generated ${links.length} links.`);
    if (missingKeys.length > 0) {
        console.log(`Missing keys for ${missingKeys.length} items.`);
    }

    const output = { links: links };
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`Saved links to ${outputFile}`);

} catch (err) {
    console.error('Error:', err);
    process.exit(1);
}
