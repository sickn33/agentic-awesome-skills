---
name: environment-setup-guide
description: "Guide developers through setting up development environments with proper tools, dependencies, and configurations"
risk: unknown
source: community
date_added: "2026-02-27"
---

# Environment Setup Guide

## Overview

Help developers set up complete development environments from scratch. This skill provides step-by-step guidance for installing tools, configuring dependencies, setting up environment variables, and verifying the setup works correctly.

## When to Use This Skill

- Use when starting a new project and need to set up the development environment
- Use when onboarding new team members to a project
- Use when switching to a new machine or operating system
- Use when troubleshooting environment-related issues
- Use when documenting setup instructions for a project
- Use when creating development environment documentation

## How It Works

### Step 1: Identify Requirements

I'll help you determine what needs to be installed:
- Programming language and version (Node.js, Python, Go, etc.)
- Package managers (npm, pip, cargo, etc.)
- Database systems (PostgreSQL, MongoDB, Redis, etc.)
- Development tools (Git, Docker, IDE extensions, etc.)
- Environment variables and configuration files

### Step 2: Check Current Setup

Before installing anything, I'll help you check what's already installed:
```bash
# Check versions of installed tools
node --version
python --version
git --version
docker --version
```

### Step 3: Provide Installation Instructions

I'll give platform-specific installation commands:
- **macOS:** Using Homebrew
- **Linux:** Using apt, yum, or package manager
- **Windows:** Using Chocolatey, Scoop, or direct installers

### Step 4: Configure the Environment

Help set up:
- Environment variables (.env files)
- Configuration files (.gitconfig, .npmrc, etc.)
- IDE settings (VS Code, IntelliJ, etc.)
- Shell configuration (.bashrc, .zshrc, etc.)

### Step 5: Verify Installation

Provide verification steps to ensure everything works:
- Run version checks
- Test basic commands
- Verify database connections
- Check environment variables are loaded

## Examples

### Example 1: Node.js Project Setup

```markdown
## Setting Up Node.js Development Environment

### Prerequisites
- macOS, Linux, or Windows
- Terminal/Command Prompt access
- Internet connection

### Step 1: Install Node.js

**macOS (using Homebrew):**
\`\`\`bash
# Install Homebrew if not installed
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
curl -fsSLo "$tmpdir/homebrew-install.sh" https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh
sed -n '1,160p' "$tmpdir/homebrew-install.sh"
/bin/bash "$tmpdir/homebrew-install.sh"

# Install Node.js
brew install node
\`\`\`

**Linux (Ubuntu/Debian):**
\`\`\`bash
# Update package list
sudo apt update

# Install Node.js and npm
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
curl -fsSLo "$tmpdir/nodesource-setup.sh" https://deb.nodesource.com/setup_20.x
sed -n '1,160p' "$tmpdir/nodesource-setup.sh"
sudo -E bash "$tmpdir/nodesource-setup.sh"
sudo apt install -y nodejs
\`\`\`

**Windows (using Chocolatey):**
\`\`\`powershell
# Install Chocolatey if not installed
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Node.js
choco install nodejs
\`\`\`

### Step 2: Verify Installation

\`\`\`bash
node --version  # Should show v20.x.x or higher
npm --version   # Should show 10.x.x or higher
\`\`\`

### Step 3: Install Project Dependencies

\`\`\`bash
# Clone the repository
git clone https://github.com/your-repo/project.git
cd project

# Install dependencies
npm install
\`\`\`

### Step 4: Set Up Environment Variables

Create a \`.env\` file:
\`\`\`bash
# Copy example environment file
cp .env.example .env

# Edit with your values
nano .env
\`\`\`

Example \`.env\` content:
\`\`\`
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/mydb
API_KEY=your-api-key-here
\`\`\`

### Step 5: Run the Project

\`\`\`bash
# Start development server
npm run dev

# Should see: Server running on http://localhost:3000
\`\`\`

### Troubleshooting

**Problem:** "node: command not found"
**Solution:** Restart your terminal or run \`source ~/.bashrc\` (Linux) or \`source ~/.zshrc\` (macOS)

**Problem:** "Permission denied" errors
**Solution:** Don't use sudo with npm. Fix permissions:
\`\`\`bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
\`\`\`
```

### Example 2: Python Project Setup

```markdown
## Setting Up Python Development Environment

### Step 1: Install Python

**macOS:**
\`\`\`bash
brew install python@3.11
\`\`\`

**Linux:**
\`\`\`bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip
\`\`\`

**Windows:**
\`\`\`powershell
choco install python --version=3.11
\`\`\`

### Step 2: Verify Installation

\`\`\`bash
python3 --version  # Should show Python 3.11.x
pip3 --version     # Should show pip 23.x.x
\`\`\`

### Step 3: Create Virtual Environment

\`\`\`bash
# Navigate to project directory
cd my-project

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate
\`\`\`

### Step 4: Install Dependencies

\`\`\`bash
# Install from requirements.txt
pip install -r requirements.txt

# Or install packages individually
pip install flask sqlalchemy python-dotenv
\`\`\`

### Step 5: Set Up Environment Variables

Create \`.env\` file:
\`\`\`
FLASK_APP=app.py
FLASK_ENV=development
DATABASE_URL=sqlite:///app.db
SECRET_KEY=your-secret-key-here
\`\`\`

### Step 6: Run the Application

\`\`\`bash
# Run Flask app
flask run

# Should see: Running on http://127.0.0.1:5000
\`\`\`
```

### Example 3: Docker Development Environment

```markdown
## Setting Up Docker Development Environment

### Step 1: Install Docker

**macOS:**
\`\`\`bash
brew install --cask docker
# Or download Docker Desktop from docker.com
\`\`\`

**Linux:**
\`\`\`bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
\`\`\`

**Windows:**
Download Docker Desktop from docker.com

### Step 2: Verify Installation

\`\`\`bash
docker --version        # Should show Docker version 24.x.x
docker-compose --version # Should show Docker Compose version 2.x.x
\`\`\`

### Step 3: Create docker-compose.yml

\`\`\`yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@db:5432/mydb
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=mydb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
\`\`\`

### Step 4: Start Services

\`\`\`bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
\`\`\`

### Step 5: Verify Services

\`\`\`bash
# Check running containers
docker ps

# Test database connection
docker-compose exec db psql -U postgres -d mydb
\`\`\`
```

## Best Practices

### ✅ Do This

- **Document Everything** - Write clear setup instructions
- **Use Version Managers** - nvm for Node, pyenv for Python
- **Create .env.example** - Show required environment variables
- **Test on Clean System** - Verify instructions work from scratch
- **Include Troubleshooting** - Document common issues and solutions
- **Use Docker** - For consistent environments across machines
- **Pin Versions** - Specify exact versions in package files
- **Automate Setup** - Create setup scripts when possible
- **Check Prerequisites** - List required tools before starting
- **Provide Verification Steps** - Help users confirm setup works

### ❌ Don't Do This

- **Don't Assume Tools Installed** - Always check and provide install instructions
- **Don't Skip Environment Variables** - Document all required variables
- **Don't Use Sudo with npm** - Fix permissions instead
- **Don't Forget Platform Differences** - Provide OS-specific instructions
- **Don't Leave Out Verification** - Always include test steps
- **Don't Use Global Installs** - Prefer local/virtual environments
- **Don't Ignore Errors** - Document how to handle common errors
- **Don't Skip Database Setup** - Include database initialization steps

## Common Pitfalls

### Problem: "Command not found" after installation
**Symptoms:** Installed tool but terminal doesn't recognize it
**Solution:**
- Restart terminal or source shell config
- Check PATH environment variable
- Verify installation location
```bash
# Check PATH
echo $PATH

# Add to PATH (example)
export PATH="/usr/local/bin:$PATH"
```

### Problem: Permission errors with npm/pip
**Symptoms:** "EACCES" or "Permission denied" errors
**Solution:**
- Don't use sudo
- Fix npm permissions or use nvm
- Use virtual environments for Python
```bash
# Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
```

### Problem: Port already in use
**Symptoms:** "Port 3000 is already in use"
**Solution:**
- Find and kill process using the port
- Use a different port
```bash
# Find process on port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### Problem: Database connection fails
**Symptoms:** "Connection refused" or "Authentication failed"
**Solution:**
- Verify database is running
- Check connection string
- Verify credentials
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U postgres -d mydb
```

## Setup Script Template

Create a `setup.sh` script to automate setup:

```bash
#!/bin/bash

echo "🚀 Setting up development environment..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not installed"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ Git not installed"; exit 1; }

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your configuration"
fi

# Run database migrations
echo "🗄️  Running database migrations..."
npm run migrate

# Verify setup
echo "🔍 Verifying setup..."
npm run test:setup

echo "✅ Setup complete! Run 'npm run dev' to start"
```

## Related Skills

- `@brainstorming` - Plan environment requirements before setup
- `@systematic-debugging` - Debug environment issues
- `@doc-coauthoring` - Create setup documentation
- `@git-pushing` - Set up Git configuration

## Additional Resources

- [Node.js Installation Guide](https://nodejs.org/en/download/)
- [Python Virtual Environments](https://docs.python.org/3/tutorial/venv.html)
- [Docker Documentation](https://docs.docker.com/get-started/)
- [Homebrew (macOS)](https://brew.sh/)
- [Chocolatey (Windows)](https://chocolatey.org/)
- [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm)
- [pyenv (Python Version Manager)](https://github.com/pyenv/pyenv)

---

**Pro Tip:** Create a `setup.sh` or `setup.ps1` script to automate the entire setup process. Test it on a clean system to ensure it works!

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
