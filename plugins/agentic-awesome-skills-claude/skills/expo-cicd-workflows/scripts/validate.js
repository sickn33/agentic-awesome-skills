#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';

import { fetchCached } from './fetch.js';

const SCHEMA_URL = 'https://api.expo.dev/v2/workflows/schema';

async function fetchSchema() {
  const data = await fetchCached(SCHEMA_URL);
  const body = JSON.parse(data);
  return body.data;
}

function createValidator(schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

async function validateFile(validator, filePath) {
  const content = await readFile(filePath, 'utf-8');

  let doc;
  try {
    doc = yaml.load(content);
  } catch (e) {
    return { valid: false, error: `YAML parse error: ${e.message}` };
  }

  const valid = validator(doc);
  if (!valid) {
    return { valid: false, error: formatErrors(validator.errors) };
  }

  return { valid: true };
}

function formatErrors(errors) {
  return errors
    .map((error) => {
      const path = error.instancePath || '(root)';
      const allowed = error.params?.allowedValues?.join(', ');
      return `  ${path}: ${error.message}${allowed ? ` (allowed: ${allowed})` : ''}`;
    })
    .join('\n');
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const files = args.filter((a) => !a.startsWith('-'));

  if (files.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: validate <workflow.yml> [workflow2.yml ...]

Validates EAS workflow YAML files against the official schema.`);
    process.exit(files.length === 0 ? 1 : 0);
  }

  const schema = await fetchSchema();
  const validator = createValidator(schema);

  let hasErrors = false;

  for (const file of files) {
    const filePath = resolve(process.cwd(), file);
    const result = await validateFile(validator, filePath);

    if (result.valid) {
      console.log(`✓ ${file}`);
    } else {
      console.error(`✗ ${file}\n${result.error}`);
      hasErrors = true;
    }
  }

  process.exit(hasErrors ? 1 : 0);
}
