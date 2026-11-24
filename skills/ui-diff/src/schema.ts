import { z } from 'zod';
import { ConfigSchema } from './config.js';

/** JSON Schema for ui-diff.config.json (editor autocompletion and validation). */
export function configJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(ConfigSchema, { io: 'input', unrepresentable: 'any' }) as Record<string, unknown>;
  return { ...schema, title: 'ui-diff configuration', description: 'Configuration for the ui-diff skill (before/after screenshots and pixel diffs for pull requests).' };
}
