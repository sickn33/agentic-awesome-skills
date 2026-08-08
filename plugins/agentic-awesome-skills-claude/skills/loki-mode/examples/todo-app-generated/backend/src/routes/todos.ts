import { Router, Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getDatabase } from '../db';
import { ApiResponse, Todo } from '../types/index';

const router = Router();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 60;
const db = getDatabase();

type TodoRow = Omit<Todo, 'completed'> & { completed: number };

function toTodo(row: TodoRow): Todo {
  return {
    ...row,
    completed: Boolean(row.completed),
  };
}

router.use(
  rateLimit({
    windowMs: WINDOW_MS,
    limit: MAX_REQUESTS_PER_WINDOW,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please retry later.' },
  })
);

// GET /api/todos - Retrieve all todos
router.get('/todos', (_req: Request, res: Response): void => {
  try {
    const rows = db.prepare('SELECT * FROM todos ORDER BY createdAt DESC').all() as TodoRow[];
    const successResponse: ApiResponse<Todo[]> = {
      success: true,
      data: rows.map(toTodo),
    };
    res.json(successResponse);
  } catch {
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: 'Database error',
    };
    res.status(500).json(errorResponse);
  }
});

// POST /api/todos - Create new todo
router.post('/todos', (req: Request, res: Response): void => {
  const { title } = req.body;

  // Validation
  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ error: 'Title is required and must be a non-empty string' });
    return;
  }

  const trimmedTitle = title.trim();
  const now = new Date().toISOString();

  try {
    const insertResult = db
      .prepare('INSERT INTO todos (title, completed, createdAt, updatedAt) VALUES (?, ?, ?, ?)')
      .run(trimmedTitle, 0, now, now);
    const row = db
      .prepare('SELECT * FROM todos WHERE id = ?')
      .get(insertResult.lastInsertRowid) as TodoRow | undefined;

    if (!row) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    const successResponse: ApiResponse<Todo> = {
      success: true,
      data: toTodo(row),
    };
    res.status(201).json(successResponse);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Database error', details });
  }
});

// PATCH /api/todos/:id - Update todo completion status
router.patch('/todos/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const { completed } = req.body;

  // Validation
  if (typeof completed !== 'boolean') {
    res.status(400).json({ error: 'Completed must be a boolean value' });
    return;
  }

  try {
    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as TodoRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    const now = new Date().toISOString();

    db.prepare('UPDATE todos SET completed = ?, updatedAt = ? WHERE id = ?').run(
      completed ? 1 : 0,
      now,
      id
    );
    const updatedRow = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as TodoRow | undefined;

    if (!updatedRow) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    const successResponse: ApiResponse<Todo> = {
      success: true,
      data: toTodo(updatedRow),
    };
    res.json(successResponse);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Database error', details });
  }
});

// DELETE /api/todos/:id - Delete todo by id
router.delete('/todos/:id', (req: Request, res: Response): void => {
  const { id } = req.params;

  // Validation - check if id is a valid number
  if (!id || isNaN(Number(id))) {
    res.status(400).json({ error: 'Invalid id parameter' });
    return;
  }

  try {
    const row = db.prepare('SELECT * FROM todos WHERE id = ?').get(id) as TodoRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }

    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Database error', details });
  }
});

export default router;
