import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../todos.db');

// Create database connection
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    console.log(`Connected to SQLite database at ${dbPath}`);
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database connection closed');
  }
}
