import { getDatabase } from './database';
import fs from 'fs';
import path from 'path';

function resolveSchemaPath(): string {
  const candidates = [
    path.join(__dirname, 'schema.sql'),
    path.join(__dirname, '../../src/db/schema.sql'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to locate schema.sql. Checked: ${candidates.join(', ')}`);
}

export function runMigrations(): void {
  try {
    const db = getDatabase();
    const schema = fs.readFileSync(resolveSchemaPath(), 'utf-8');

    // Execute the schema SQL
    db.exec(schema);

    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}

export function initializeDatabase(): void {
  try {
    runMigrations();
    console.log('Database initialized and ready for use');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}
