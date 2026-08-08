---
name: readme
description: "You are an expert technical writer creating comprehensive project documentation. Your goal is to write a README.md that is absurdly thorough—the kind of documentation you wish every project had."
risk: safe
source: "https://github.com/Shpigford/skills/tree/main/readme"
date_added: "2026-02-27"
---

# README Generator

You are an expert technical writer creating comprehensive project documentation. Your goal is to write a README.md that is absurdly thorough—the kind of documentation you wish every project had.

## When to Use This Skill

Use this skill when:

- User wants to create or update a README.md file
- User says "write readme" or "create readme"
- User asks to "document this project"
- User requests "project documentation"
- User asks for help with README.md

## The Three Purposes of a README

1. **Local Development** - Help any developer get the app running locally in minutes
2. **Understanding the System** - Explain in great detail how the app works
3. **Production Deployment** - Cover everything needed to deploy and maintain in production

---

## Before Writing

### Step 1: Deep Codebase Exploration

Before writing a single line of documentation, thoroughly explore the codebase. You MUST understand:

**Project Structure**

- Read the root directory structure
- Identify the framework/language (Gemfile for Rails, package.json, go.mod, requirements.txt, etc.)
- Find the main entry point(s)
- Map out the directory organization

**Configuration Files**

- .env.example, .env.sample, or documented environment variables
- Rails config files (config/database.yml, config/application.rb, config/environments/)
- Credentials setup (config/credentials.yml.enc, config/master.key)
- Docker files (Dockerfile, docker-compose.yml)
- CI/CD configs (.github/workflows/, .gitlab-ci.yml, etc.)
- Deployment configs (config/deploy.yml for Kamal, fly.toml, render.yaml, Procfile, etc.)

**Database**

- db/schema.rb or db/structure.sql
- Migrations in db/migrate/
- Seeds in db/seeds.rb
- Database type from config/database.yml

**Key Dependencies**

- Gemfile and Gemfile.lock for Ruby gems
- package.json for JavaScript dependencies
- Note any native gem dependencies (pg, nokogiri, etc.)

**Scripts and Commands**

- bin/ scripts (bin/dev, bin/setup, bin/ci)
- Procfile or Procfile.dev
- Rake tasks (lib/tasks/)

### Step 2: Identify Deployment Target

Look for these files to determine deployment platform and tailor instructions:

- `Dockerfile` / `docker-compose.yml` → Docker-based deployment
- `vercel.json` / `.vercel/` → Vercel
- `netlify.toml` → Netlify
- `fly.toml` → Fly.io
- `railway.json` / `railway.toml` → Railway
- `render.yaml` → Render
- `app.yaml` → Google App Engine
- `Procfile` → Heroku or Heroku-like platforms
- `.ebextensions/` → AWS Elastic Beanstalk
- `serverless.yml` → Serverless Framework
- `terraform/` / `*.tf` → Terraform/Infrastructure as Code
- `k8s/` / `kubernetes/` → Kubernetes

If no deployment config exists, provide general guidance with Docker as the recommended approach.

### Step 3: Ask Only If Critical

Only ask the user questions if you cannot determine:

- What the project does (if not obvious from code)
- Specific deployment credentials or URLs needed
- Business context that affects documentation

Otherwise, proceed with exploration and writing.

---

## README Structure

Write the README with these sections in order:

### 1. Project Title and Overview

```markdown
# Project Name

Brief description of what the project does and who it's for. 2-3 sentences max.

## Key Features

- Feature 1
- Feature 2
- Feature 3
```

### 2. Tech Stack

List all major technologies:

```markdown
## Tech Stack

- **Language**: Ruby 3.3+
- **Framework**: Rails 7.2+
- **Frontend**: Inertia.js with React
- **Database**: PostgreSQL 16
- **Background Jobs**: Solid Queue
- **Caching**: Solid Cache
- **Styling**: Tailwind CSS
- **Deployment**: [Detected platform]
```

### 3. Prerequisites

What must be installed before starting:

```markdown
## Prerequisites

- Node.js 20 or higher
- PostgreSQL 15 or higher (or Docker)
- pnpm (recommended) or npm
- A Google Cloud project for OAuth (optional for development)
```

### 4. Getting Started

The complete local development guide:

```markdown
## Getting Started

### 1. Clone the Repository

\`\`\`bash
git clone https://github.com/user/repo.git
cd repo
\`\`\`

### 2. Install Ruby Dependencies

Ensure you have Ruby 3.3+ installed (via rbenv, asdf, or mise):

\`\`\`bash
bundle install
\`\`\`

### 3. Install JavaScript Dependencies

\`\`\`bash
yarn install
\`\`\`

### 4. Environment Setup

Copy the example environment file:

\`\`\`bash
cp .env.example .env
\`\`\`

Configure the following variables:

| Variable           | Description                  | Example                                    |
| ------------------ | ---------------------------- | ------------------------------------------ |
| `DATABASE_URL`     | PostgreSQL connection string | `postgresql://localhost/myapp_development` |
| `REDIS_URL`        | Redis connection (if used)   | `redis://localhost:6379/0`                 |
| `SECRET_KEY_BASE`  | Rails secret key             | `bin/rails secret`                         |
| `RAILS_MASTER_KEY` | For credentials encryption   | Check `config/master.key`                  |

### 5. Database Setup

Start PostgreSQL (if using Docker):

\`\`\`bash
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
\`\`\`

Create and set up the database:

\`\`\`bash
bin/rails db:setup
\`\`\`

This runs `db:create`, `db:schema:load`, and `db:seed`.

For existing databases, run migrations:

\`\`\`bash
bin/rails db:migrate
\`\`\`

### 6. Start Development Server

Using Foreman/Overmind (recommended, runs Rails + Vite):

\`\`\`bash
bin/dev
\`\`\`

Or manually:

\`\`\`bash

# Terminal 1: Rails server

bin/rails server

# Terminal 2: Vite dev server (for Inertia/React)

bin/vite dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.
```

Include every step. Assume the reader is setting up on a fresh machine.

### 5. Architecture Overview

This is where you go absurdly deep:

```markdown
## Architecture

### Directory Structure

\`\`\`
├── app/
│ ├── controllers/ # Rails controllers
│ │ ├── concerns/ # Shared controller modules
│ │ └── api/ # API-specific controllers
│ ├── models/ # ActiveRecord models
│ │ └── concerns/ # Shared model modules
│ ├── jobs/ # Background jobs (Solid Queue)
│ ├── mailers/ # Email templates
│ ├── views/ # Rails views (minimal with Inertia)
│ └── frontend/ # Inertia.js React components
│ ├── components/ # Reusable UI components
│ ├── layouts/ # Page layouts
│ ├── pages/ # Inertia page components
│ └── lib/ # Frontend utilities
├── config/
│ ├── routes.rb # Route definitions
│ ├── database.yml # Database configuration
│ └── initializers/ # App initializers
├── db/
│ ├── migrate/ # Database migrations
│ ├── schema.rb # Current schema
│ └── seeds.rb # Seed data
├── lib/
│ └── tasks/ # Custom Rake tasks
└── public/ # Static assets
\`\`\`

### Request Lifecycle

1. Request hits Rails router (`config/routes.rb`)
2. Middleware stack processes request (authentication, sessions, etc.)
3. Controller action executes
4. Models interact with PostgreSQL via ActiveRecord
5. Inertia renders React component with props
6. Response sent to browser

### Data Flow

\`\`\`
User Action → React Component → Inertia Visit → Rails Controller → ActiveRecord → PostgreSQL
↓
React Props ← Inertia Response ←
\`\`\`

### Key Components

**Authentication**

- Devise/Rodauth for user authentication
- Session-based auth with encrypted cookies
- `authenticate_user!` before_action for protected routes

**Inertia.js Integration (`app/frontend/`)**

- React components receive props from Rails controllers
- `inertia_render` in controllers passes data to frontend
- Shared data via `inertia_share` for layout props

**Background Jobs (`app/jobs/`)**

- Solid Queue for job processing
- Jobs stored in PostgreSQL (no Redis required)
- Dashboard at `/jobs` for monitoring

**Database (`app/models/`)**

- ActiveRecord models with associations
- Query objects for complex queries
- Concerns for shared model behavior

### Database Schema

\`\`\`
users
├── id (bigint, PK)
├── email (string, unique, not null)
├── encrypted_password (string)
├── name (string)
├── created_at (datetime)
└── updated_at (datetime)

posts
├── id (bigint, PK)
├── title (string, not null)
├── content (text)
├── published (boolean, default: false)
├── user_id (bigint, FK → users)
├── created_at (datetime)
└── updated_at (datetime)

solid_queue_jobs (background jobs)
├── id (bigint, PK)
├── queue_name (string)
├── class_name (string)
├── arguments (json)
├── scheduled_at (datetime)
└── ...
\`\`\`
```

### 6. Environment Variables

Complete reference for all env vars:

```markdown
## Environment Variables

### Required

| Variable           | Description                       | How to Get                             |
| ------------------ | --------------------------------- | -------------------------------------- |
| `DATABASE_URL`     | PostgreSQL connection string      | Your database provider                 |
| `SECRET_KEY_BASE`  | Rails secret for sessions/cookies | Run `bin/rails secret`                 |
| `RAILS_MASTER_KEY` | Decrypts credentials file         | Check `config/master.key` (not in git) |

### Optional

| Variable            | Description                                       | Default                      |
| ------------------- | ------------------------------------------------- | ---------------------------- |
| `REDIS_URL`         | Redis connection string (for caching/ActionCable) | -                            |
| `RAILS_LOG_LEVEL`   | Logging verbosity                                 | `debug` (dev), `info` (prod) |
| `RAILS_MAX_THREADS` | Puma thread count                                 | `5`                          |
| `WEB_CONCURRENCY`   | Puma worker count                                 | `2`                          |
| `SMTP_ADDRESS`      | Mail server hostname                              | -                            |
| `SMTP_PORT`         | Mail server port                                  | `587`                        |

### Rails Credentials

Sensitive values should be stored in Rails encrypted credentials:

\`\`\`bash

# Edit credentials (opens in $EDITOR)

bin/rails credentials:edit

# Or for environment-specific credentials

RAILS_ENV=production bin/rails credentials:edit
\`\`\`

Credentials file structure:
\`\`\`yaml
secret_key_base: xxx
stripe:
public_key: pk_xxx
secret_key: sk_xxx
google:
client_id: xxx
client_secret: xxx
\`\`\`

Access in code: `Rails.application.credentials.stripe[:secret_key]`

### Environment-Specific

**Development**
\`\`\`
DATABASE_URL=postgresql://localhost/myapp_development
REDIS_URL=redis://localhost:6379/0
\`\`\`

**Production**
\`\`\`
DATABASE_URL=<production-connection-string>
RAILS_ENV=production
RAILS_SERVE_STATIC_FILES=true
\`\`\`
```

### 7. Available Scripts

```markdown
## Available Scripts

| Command                       | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| `bin/dev`                     | Start development server (Rails + Vite via Foreman) |
| `bin/rails server`            | Start Rails server only                             |
| `bin/vite dev`                | Start Vite dev server only                          |
| `bin/rails console`           | Open Rails console (IRB with app loaded)            |
| `bin/rails db:migrate`        | Run pending database migrations                     |
| `bin/rails db:rollback`       | Rollback last migration                             |
| `bin/rails db:seed`           | Run database seeds                                  |
| `bin/rails db:reset`          | Drop, create, migrate, and seed database            |
| `bin/rails routes`            | List all routes                                     |
| `bin/rails test`              | Run test suite (Minitest)                           |
| `bundle exec rspec`           | Run test suite (RSpec, if used)                     |
| `bin/rails assets:precompile` | Compile assets for production                       |
| `bin/rubocop`                 | Run Ruby linter                                     |
| `yarn lint`                   | Run JavaScript/TypeScript linter                    |
```

### 8. Testing

```markdown
## Testing

### Running Tests

\`\`\`bash

# Run all tests (Minitest)

bin/rails test

# Run all tests (RSpec, if used)

bundle exec rspec

# Run specific test file

bin/rails test test/models/user_test.rb
bundle exec rspec spec/models/user_spec.rb

# Run tests matching a pattern

bin/rails test -n /creates_user/
bundle exec rspec -e "creates user"

# Run system tests (browser tests)

bin/rails test:system

# Run with coverage (SimpleCov)

COVERAGE=true bin/rails test
\`\`\`

### Test Structure

\`\`\`
test/ # Minitest structure
├── controllers/ # Controller tests
├── models/ # Model unit tests
├── integration/ # Integration tests
├── system/ # System/browser tests
├── fixtures/ # Test data
└── test_helper.rb # Test configuration

spec/ # RSpec structure (if used)
├── models/
├── requests/
├── system/
├── factories/ # FactoryBot factories
├── support/
└── rails_helper.rb
\`\`\`

### Writing Tests

**Minitest example:**
\`\`\`ruby
require "test_helper"

class UserTest < ActiveSupport::TestCase
test "creates user with valid attributes" do
user = User.new(email: "test@example.com", name: "Test User")
assert user.valid?
end

test "requires email" do
user = User.new(name: "Test User")
assert_not user.valid?
assert_includes user.errors[:email], "can't be blank"
end
end
\`\`\`

**RSpec example:**
\`\`\`ruby
require "rails_helper"

RSpec.describe User, type: :model do
describe "validations" do
it "is valid with valid attributes" do
user = build(:user)
expect(user).to be_valid
end

    it "requires an email" do
      user = build(:user, email: nil)
      expect(user).not_to be_valid
      expect(user.errors[:email]).to include("can't be blank")
    end

end
end
\`\`\`

### Frontend Testing

For Inertia/React components:

\`\`\`bash
yarn test
\`\`\`

\`\`\`typescript
import { render, screen } from '@testing-library/react'
import { Dashboard } from './Dashboard'

describe('Dashboard', () => {
it('renders user name', () => {
render(<Dashboard user={{ name: 'Josh' }} />)
expect(screen.getByText('Josh')).toBeInTheDocument()
})
})
\`\`\`
```

### 9. Deployment

Tailor this to detected platform (look for Dockerfile, fly.toml, render.yaml, kamal/, etc.):

```markdown
## Deployment

### Kamal (Recommended for Rails)

If using Kamal for deployment:

\`\`\`bash

# Setup Kamal (first time)

kamal setup

# Deploy

kamal deploy

# Rollback to previous version

kamal rollback

# View logs

kamal app logs

# Run console on production

kamal app exec --interactive 'bin/rails console'
\`\`\`

Configuration lives in `config/deploy.yml`.

### Docker

Build and run:

\`\`\`bash

# Build image

docker build -t myapp .

# Run with environment variables

docker run -p 3000:3000 \
 -e DATABASE_URL=postgresql://... \
 -e SECRET_KEY_BASE=... \
 -e RAILS_ENV=production \
 myapp
\`\`\`

### Heroku

\`\`\`bash

# Create app

heroku create myapp

# Add PostgreSQL

heroku addons:create heroku-postgresql:mini

# Set environment variables

heroku config:set SECRET_KEY_BASE=$(bin/rails secret)
heroku config:set RAILS_MASTER_KEY=$(cat config/master.key)

# Deploy

git push heroku main

# Run migrations

heroku run bin/rails db:migrate
\`\`\`

### Fly.io

\`\`\`bash

# Launch (first time)

fly launch

# Deploy

fly deploy

# Run migrations

fly ssh console -C "bin/rails db:migrate"

# Open console

fly ssh console -C "bin/rails console"
\`\`\`

### Render

If `render.yaml` exists, connect your repo to Render and it will auto-deploy.

Manual setup:

1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `bundle install && bin/rails assets:precompile`
4. Set start command: `bin/rails server`
5. Add environment variables in dashboard

### Manual/VPS Deployment

\`\`\`bash

# On the server:

# Pull latest code

git pull origin main

# Install dependencies

bundle install --deployment

# Compile assets

RAILS_ENV=production bin/rails assets:precompile

# Run migrations

RAILS_ENV=production bin/rails db:migrate

# Restart application server (e.g., Puma via systemd)

sudo systemctl restart myapp
\`\`\`
```

### 10. Troubleshooting

```markdown
## Troubleshooting

### Database Connection Issues

**Error:** `could not connect to server: Connection refused`

**Solution:**

1. Verify PostgreSQL is running: `pg_isready` or `docker ps`
2. Check `DATABASE_URL` format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
3. Ensure database exists: `bin/rails db:create`

### Pending Migrations

**Error:** `Migrations are pending`

**Solution:**
\`\`\`bash
bin/rails db:migrate
\`\`\`

### Asset Compilation Issues

**Error:** `The asset "application.css" is not present in the asset pipeline`

**Solution:**
\`\`\`bash

# Clear and recompile assets

bin/rails assets:clobber
bin/rails assets:precompile
\`\`\`

### Bundle Install Failures

**Error:** Native extension build failures

**Solution:**

1. Ensure system dependencies are installed:
   \`\`\`bash

   # macOS

   brew install postgresql libpq

   # Ubuntu

   sudo apt-get install libpq-dev
   \`\`\`

2. Try again: `bundle install`

### Credentials Issues

**Error:** `ActiveSupport::MessageEncryptor::InvalidMessage`

**Solution:**
The master key doesn't match the credentials file. Either:

1. Get the correct `config/master.key` from another team member
2. Or regenerate credentials: `rm config/credentials.yml.enc && bin/rails credentials:edit`

### Vite/Inertia Issues

**Error:** `Vite Ruby - Build failed`

**Solution:**
\`\`\`bash

# Clear Vite cache

rm -rf node_modules/.vite

# Reinstall JS dependencies

rm -rf node_modules && yarn install
\`\`\`

### Solid Queue Issues

**Error:** Jobs not processing

**Solution:**
Ensure the queue worker is running:
\`\`\`bash
bin/jobs

# or

bin/rails solid_queue:start
\`\`\`
```

### 11. Contributing (Optional)

Include if open source or team project.

### 12. License (Optional)

---

## Writing Principles

1. **Be Absurdly Thorough** - When in doubt, include it. More detail is always better.

2. **Use Code Blocks Liberally** - Every command should be copy-pasteable.

3. **Show Example Output** - When helpful, show what the user should expect to see.

4. **Explain the Why** - Don't just say "run this command," explain what it does.

5. **Assume Fresh Machine** - Write as if the reader has never seen this codebase.

6. **Use Tables for Reference** - Environment variables, scripts, and options work great as tables.

7. **Keep Commands Current** - Use `pnpm` if the project uses it, `npm` if it uses npm, etc.

8. **Include a Table of Contents** - For READMEs over ~200 lines, add a TOC at the top.

---

## Output Format

Generate a complete README.md file with:

- Proper markdown formatting
- Code blocks with language hints (`bash, `typescript, etc.)
- Tables where appropriate
- Clear section hierarchy
- Linked table of contents for long documents

Write the README directly to `README.md` in the project root.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
