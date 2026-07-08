# PRD: Full-Stack Demo App

## Overview
A complete full-stack application demonstrating Loki Mode's end-to-end capabilities. A simple bookmark manager with tags.

## Target Users
Users who want to save and organize bookmarks.

## Features

### Core Features
1. **Add Bookmark** - Save URL with title and optional tags
2. **View Bookmarks** - List all bookmarks with search/filter
3. **Edit Bookmark** - Update title, URL, or tags
4. **Delete Bookmark** - Remove bookmark
5. **Tag Management** - Create, view, and filter by tags

### User Flow
1. User opens app → sees bookmark list
2. Clicks "Add Bookmark" → form appears
3. Enters URL, title, tags → submits
4. Bookmark appears in list
5. Can filter by tag or search by title
6. Can edit or delete any bookmark

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for bundling
- TailwindCSS for styling
- React Query for data fetching

### Backend
- Node.js 18+
- Express.js
- SQLite with better-sqlite3
- zod for validation

### Structure
```
/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── db/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## API Endpoints

### Bookmarks
- `GET /api/bookmarks` - List all (query: `?tag=`, `?search=`)
- `POST /api/bookmarks` - Create new
- `PUT /api/bookmarks/:id` - Update
- `DELETE /api/bookmarks/:id` - Delete

### Tags
- `GET /api/tags` - List all tags with counts

## Database Schema
```sql
CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE bookmark_tags (
  bookmark_id INTEGER REFERENCES bookmarks(id),
  tag_id INTEGER REFERENCES tags(id),
  PRIMARY KEY (bookmark_id, tag_id)
);
```

## Requirements
- TypeScript throughout
- Input validation (frontend + backend)
- Error handling with user feedback
- Loading states
- Empty states
- Responsive design

## Testing
- Backend: Jest + supertest for API tests
- Frontend: Basic component tests (optional)
- E2E: Manual testing checklist

## Out of Scope
- User authentication
- Import/export
- Browser extension
- Cloud deployment
- Real-time sync

## Success Criteria
- All CRUD operations work
- Search and filter work
- No console errors
- Tests pass
- Code review passes (all 3 reviewers)

---

**Purpose:** Comprehensive test of Loki Mode's full capabilities including frontend, backend, database, and code review agents. Expect ~30-60 minutes for full execution.
