import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { configJsonSchema } from '../src/schema.js';

const target = fileURLToPath(new URL('../schema/ui-diff.config.schema.json', import.meta.url));
writeFileSync(target, `${JSON.stringify(configJsonSchema(), null, 2)}\n`);
console.log(`wrote ${target}`);
