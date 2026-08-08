const assert = require('assert');
const fs = require('fs');
const path = require('path');

const workflowsDir = path.resolve(__dirname, '..', '..', '..', '.github', 'workflows');
const workflowFiles = fs.readdirSync(workflowsDir).filter((file) => file.endsWith('.yml'));
const mutableRefs = [];

for (const file of workflowFiles) {
  const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
  for (const [lineIndex, line] of content.split(/\r?\n/).entries()) {
    const match = line.match(/^\s*-?\s*uses:\s*([^\s#]+)@([^\s#]+)/);
    if (match && !/^[a-f0-9]{40}$/i.test(match[2])) {
      mutableRefs.push(`${file}:${lineIndex + 1} ${match[1]}@${match[2]}`);
    }
  }
}

assert.deepStrictEqual(mutableRefs, [], `Mutable GitHub Action refs found:\n${mutableRefs.join('\n')}`);
