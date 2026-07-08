# PRD: REST API Service

## Overview
A simple REST API for managing notes. Tests Loki Mode's backend-only capabilities.

## Target Users
Developers who need a notes API.

## API Endpoints

### Notes Resource

#### GET /api/notes
- Returns list of all notes
- Response: `[{ id, title, content, createdAt }]`

#### GET /api/notes/:id
- Returns single note
- Response: `{ id, title, content, createdAt }`
- Error: 404 if not found

#### POST /api/notes
- Creates new note
- Body: `{ title, content }`
- Response: `{ id, title, content, createdAt }`
- Error: 400 if validation fails

#### PUT /api/notes/:id
- Updates existing note
- Body: `{ title?, content? }`
- Response: `{ id, title, content, updatedAt }`
- Error: 404 if not found

#### DELETE /api/notes/:id
- Deletes note
- Response: 204 No Content
- Error: 404 if not found

### Health Check

#### GET /health
- Returns `{ status: "ok", timestamp }`

## Tech Stack
- Runtime: Node.js 18+
- Framework: Express.js
- Database: In-memory (array) for simplicity
- Validation: zod or joi
- Testing: Jest + supertest

## Requirements
- Input validation on all endpoints
- Proper HTTP status codes
- JSON error responses
- Request logging
- Unit tests for each endpoint

## Out of Scope
- Authentication
- Database persistence
- Rate limiting
- API documentation (OpenAPI)
- Deployment

## Test Cases
```
POST /api/notes with valid data → 201 + note object
POST /api/notes with missing title → 400 + error
GET /api/notes → 200 + array
GET /api/notes/:id with valid id → 200 + note
GET /api/notes/:id with invalid id → 404
PUT /api/notes/:id with valid data → 200 + updated note
DELETE /api/notes/:id → 204
GET /health → 200 + status object
```

---

**Purpose:** Tests backend agent capabilities, code review, and QA without frontend complexity.
