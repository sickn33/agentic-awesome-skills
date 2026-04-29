# Skills Update Guide

This guide explains how to update the skills in the Antigravity Awesome Skills web application.

## Automatic Updates (Recommended)

The `START_APP.bat` file automatically checks for and updates skills when you run it. It uses multiple methods:

1. **Git method** (if Git is installed): Fast and efficient
2. **PowerShell download** (fallback): Works without Git

## Manual Update Options

### Option 1: Using npm script (Recommended for manual updates)
```bash
npm run update:skills
```

This command:
- Generates the latest skills index from the skills directory
- Copies it to the web app's public directory
- Requires Python and PyYAML to be installed

### Option 2: Using START_APP.bat (Integrated solution)
```bash
START_APP.bat
```

The START_APP.bat file includes integrated update functionality that:
- Automatically checks for updates on startup
- Uses Git if available (fast method)
- Falls back to HTTPS download if Git is not installed
- Handles all dependencies automatically
- Provides clear status messages
- Works without any additional setup

### Option 3: Manual steps
```bash
# 1. Generate skills index
python tools/scripts/generate_index.py

# 2. Copy to web app
copy skills_index.json apps\web-app\public\skills.json
```

## Prerequisites

For manual updates, you need:

- **Python 3.x**: Download from [python.org](https://python.org/)
- **PyYAML**: Install with `pip install PyYAML`

## Troubleshooting

### "Python is not recognized"
- Install Python from [python.org](https://python.org/)
- Make sure to check "Add Python to PATH" during installation

### "PyYAML not found"
- Install with: `pip install PyYAML`
- Or run the update script which will install it automatically

### "Failed to copy skills"
- Make sure the `apps\web-app\public\` directory exists
- Check file permissions

## What Gets Updated

The update process refreshes:
- Skills index (`skills_index.json`)
- Web app skills data (`apps\web-app\public\skills.json`)
- All 1,439+ skills from the skills directory

## When to Update

Update skills when:
- New skills are added to the repository
- You want the latest skill descriptions
- Skills appear missing or outdated in the web app

## Git Users

If you have Git installed and want to update the entire repository:
```bash
git pull origin main
npm run update:skills
```

This pulls the latest code and updates the skills data.
