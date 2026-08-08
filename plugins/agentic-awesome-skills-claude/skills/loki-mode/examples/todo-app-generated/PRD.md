# PRD: Simple Todo App

## Overview
A minimal todo application for testing Loki Mode with a simple, well-defined scope.

## Target Users
Individual users who want a simple way to track tasks.

## Features

### MVP Features
1. **Add Todo** - Users can add a new todo item with a title
2. **View Todos** - Display list of all todos
3. **Complete Todo** - Mark a todo as done
4. **Delete Todo** - Remove a todo from the list

### Tech Stack (Suggested)
- Frontend: React + TypeScript
- Backend: Node.js + Express
- Database: SQLite (local file)
- No deployment (local testing only)

## Acceptance Criteria

### Add Todo
- [ ] Input field for todo title
- [ ] Submit button
- [ ] New todo appears in list
- [ ] Input clears after submit

### View Todos
- [ ] Shows all todos in a list
- [ ] Shows completion status
- [ ] Empty state when no todos

### Complete Todo
- [ ] Checkbox or button to mark complete
- [ ] Visual indicator for completed items
- [ ] Persists after refresh

### Delete Todo
- [ ] Delete button on each todo
- [ ] Confirmation before delete
- [ ] Removes from list and database

## Out of Scope
- User authentication
- Due dates
- Categories/tags
- Mobile app
- Cloud deployment

## Success Metrics
- All features functional
- Tests passing
- No console errors

---

**Purpose:** This PRD is intentionally simple to allow quick testing of Loki Mode's core functionality without waiting for complex builds or deployments.
