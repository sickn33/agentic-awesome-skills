const fs = require('fs');
const path = require('path');

if (process.argv.length < 3) {
    console.log("Usage: node robust_parse_sprint.js <input_markdown_file> [output_json_file]");
    process.exit(1);
}

const inputFile = process.argv[2];
// Default output to the same directory as input, with _tasks.json extension
const defaultOutput = path.join(path.dirname(inputFile), path.basename(inputFile, path.extname(inputFile)) + '_tasks.json');
const outputFile = process.argv[3] || defaultOutput;

console.log(`Reading from: ${inputFile}`);
console.log(`Writing to: ${outputFile}`);

try {
    const rawContent = fs.readFileSync(inputFile, 'utf8');
    const filename = path.basename(inputFile, '.md');

    // Epic Details
    const epicSummary = `[${filename.replace(/\[.*?\]/g, '').trim()}] ${filename}`;
    const epicDescription = `Tasks extracted from ${filename}.`;

    const tasks = [];
    let currentTask = null;
    let currentSection = null; // 'Context', 'Todo', 'AC', 'Deps'
    let inCodeBlock = false;

    // Helper to clean summary
    function cleanSummary(s) {
        if (!s) return '';
        return s.replace(/\\\[/g, '[').replace(/\\\]/g, ']').replace(/\\-/g, '-').trim();
    }

    const lines = rawContent.split('\n');

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        // Skip empty lines if not in code block
        if (trimmedLine.length === 0 && !inCodeBlock) return;

        // Reset section if we hit a markdown header (Level 2+)
        if (trimmedLine.startsWith('##')) {
            currentSection = null;
            return;
        }

        // Indentation calculation
        // Handle tabs as 4 spaces?
        const expandedLine = line.replace(/\t/g, '    ');
        const indentation = expandedLine.match(/^\s*/)[0].length;

        // Robust detection: Valid tasks usually start with number + dot + space + [Tag]
        // But we want to be flexible.
        // Heuristic: Indentation === 0 implies top level.
        const isTopLevel = indentation === 0 && /^\d+\.\s+(\\?\[.*\])?/.test(trimmedLine);

        // Check for new Task
        if (isTopLevel) {
            const ticketMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
            if (ticketMatch) {
                if (currentTask) {
                    tasks.push(currentTask);
                }
                currentTask = {
                    summary: cleanSummary(ticketMatch[2]),
                    sp: 0,
                    context: [],
                    todo: [],
                    ac: [],
                    deps: [],
                    rawDescription: []
                };
                currentSection = null;
                inCodeBlock = false;
                return;
            }
        }

        if (!currentTask) return;

        // Parse SP
        const spMatch = trimmedLine.match(/^(?:(\d+\.|[-*])\s*)?SP:\s*(.*)$/i);
        if (spMatch) {
            const spVal = spMatch[2].trim();
            currentTask.sp = (spVal.toUpperCase() === 'TBD') ? 0 : (parseFloat(spVal) || 0);
            return;
        }

        // Section Detection
        const sectionMatch = trimmedLine.match(/^(?:(\d+\.|[-*])\s*)?(Context|Todo|AC|Acceptance Criteria|Deps|Dependencies)(?::\s*(.*))?$/i);

        if (sectionMatch && !inCodeBlock) {
            let sectionName = sectionMatch[2].toLowerCase();
            let inlineContent = sectionMatch[3] ? sectionMatch[3].trim() : '';

            if (sectionName.includes('context')) currentSection = 'context';
            else if (sectionName.includes('todo')) currentSection = 'todo';
            else if (sectionName.includes('ac') || sectionName.includes('acceptance')) currentSection = 'ac';
            else if (sectionName.includes('dep')) currentSection = 'deps';

            if (inlineContent) {
                if (currentSection === 'context') currentTask.context.push(inlineContent);
                else if (currentSection === 'todo') currentTask.todo.push(inlineContent);
                else if (currentSection === 'ac') currentTask.ac.push(inlineContent);
                else if (currentSection === 'deps') currentTask.deps.push(inlineContent);
            }
            return;
        }

        // Content Handling
        if (currentSection) {
            if (currentTask[currentSection]) {
                currentTask[currentSection].push(line);
            }
        }
    });

    if (currentTask) {
        tasks.push(currentTask);
    }

    // Post-processing to generate the final description string
    const finalTasks = tasks.map(s => {
        let sections = [];

        // Helper to formatting a section
        const formatSection = (title, lines) => {
            if (!lines || lines.length === 0) return '';

            let formattedLines = [];
            let inCodeBlock = false;

            lines.forEach(l => {
                let text = l.trim();
                if (text.length === 0 && !inCodeBlock) return;

                let cleanText = text.replace(/^(\d+(\.\d+)*\.?|[-*])\s+/, '');

                if (/^(request|response):/i.test(cleanText)) {
                    formattedLines.push(`# ${cleanText}`);
                    return;
                }

                cleanText = cleanText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1|$2]');
                cleanText = cleanText.replace(/!\[.*?\]\(data:image.*?\)/g, '[Image removed]');

                const jsonStartRegex = /^(\{\s*($|"|“|”|\})|\[\s*($|"|“|”|\d|true|false|null|\{|\[|\]))/;

                if (jsonStartRegex.test(cleanText) && !inCodeBlock) {
                    formattedLines.push('{code:json}');
                    formattedLines.push(cleanText);
                    inCodeBlock = true;
                    if ((cleanText.endsWith('}') || cleanText.endsWith(']')) && cleanText.length > 1) {
                        formattedLines.push('{code}');
                        inCodeBlock = false;
                    }
                    return;
                }

                if ((cleanText.endsWith('}') || cleanText.endsWith(']')) && inCodeBlock) {
                    formattedLines.push(cleanText);
                    formattedLines.push('{code}');
                    inCodeBlock = false;
                    return;
                }

                if (inCodeBlock) {
                    formattedLines.push(cleanText);
                    return;
                }

                formattedLines.push(`# ${cleanText}`);
            });

            if (inCodeBlock) {
                formattedLines.push('{code}');
            }

            return `h2. ${title}\n` + formattedLines.join('\n');
        };

        const contextLink = `[Link to Context|#]`; // Placeholder or could be real link

        return {
            summary: s.summary,
            sp: s.sp,
            description: [
                (s.context.length ? formatSection('Context', s.context) : ''),
                (s.todo.length ? formatSection('Todo', s.todo) : ''),
                (s.ac.length ? formatSection('AC', s.ac) : ''),
                (s.deps.length ? formatSection('Dependencies', s.deps) : '')
            ].filter(Boolean).join('\n\n'),
            deps: s.deps,
            original_summary: s.summary
        };
    });

    const output = {
        epic: {
            summary: epicSummary,
            description: epicDescription
        },
        tasks: finalTasks // Naming it tasks for consistency
    };

    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`Successfully parsed ${finalTasks.length} tasks.`);
    console.log(`Saved to ${outputFile}`);

} catch (err) {
    console.error("Error parsing file:", err);
    process.exit(1);
}
