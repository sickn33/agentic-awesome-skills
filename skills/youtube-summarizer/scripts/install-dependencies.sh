#!/usr/bin/env bash
# Install youtube-transcript-api dependency

set -e

echo "📦 Installing youtube-transcript-api..."

if ! command -v python3 &>/dev/null; then
    echo "Python 3 is required" >&2
    exit 1
fi
if [ -z "${VIRTUAL_ENV:-}" ]; then
    echo "Activate a project virtual environment before installing dependencies" >&2
    exit 1
fi
python3 -m pip install youtube-transcript-api

# Verify installation
python3 -c "import youtube_transcript_api; print('✅ youtube-transcript-api is ready to use!')" 2>/dev/null || {
    echo "⚠️  Installation completed but verification failed"
    echo "Try running: python3 -c 'import youtube_transcript_api'"
    exit 1
}
