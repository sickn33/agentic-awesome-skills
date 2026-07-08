#!/bin/bash
#===============================================================================
# Record Full Loki Mode End-to-End Demo
#
# This script:
# 1. Creates a fresh demo workspace
# 2. Starts screen recording
# 3. Runs Loki Mode with a PRD
# 4. Opens dashboard in browser
# 5. Records until completion or timeout
# 6. Outputs final video
#
# Usage:
#   ./demo/record-full-demo.sh [simple-todo|static-landing]
#===============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEMO_TYPE="${1:-simple-todo}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Config
DEMO_WORKSPACE="/tmp/loki-full-demo-$TIMESTAMP"
OUTPUT_DIR="$SCRIPT_DIR/recordings"
OUTPUT_FILE="$OUTPUT_DIR/loki-full-demo-$DEMO_TYPE-$TIMESTAMP.mp4"
MAX_DURATION=1800  # 30 minutes max

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

# Select PRD based on demo type
case "$DEMO_TYPE" in
    simple-todo)
        PRD_SOURCE="$PROJECT_DIR/examples/simple-todo-app.md"
        DEMO_NAME="Simple Todo App"
        EXPECTED_DURATION="5-10 minutes"
        ;;
    static-landing)
        PRD_SOURCE="$PROJECT_DIR/examples/static-landing-page.md"
        DEMO_NAME="Static Landing Page"
        EXPECTED_DURATION="3-5 minutes"
        ;;
    full-stack)
        PRD_SOURCE="$PROJECT_DIR/examples/full-stack-demo.md"
        DEMO_NAME="Full-Stack Bookmark Manager"
        EXPECTED_DURATION="15-30 minutes"
        ;;
    *)
        echo "Unknown demo type: $DEMO_TYPE"
        echo "Usage: $0 [simple-todo|static-landing|full-stack]"
        exit 1
        ;;
esac

mkdir -p "$OUTPUT_DIR"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  LOKI MODE FULL DEMO RECORDING${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo "Demo:             $DEMO_NAME"
echo "PRD:              $PRD_SOURCE"
echo "Expected time:    $EXPECTED_DURATION"
echo "Workspace:        $DEMO_WORKSPACE"
echo "Output:           $OUTPUT_FILE"
echo ""

# Pre-flight checks
log_step "Checking prerequisites..."

if ! command -v ffmpeg &> /dev/null; then
    log_warn "ffmpeg not found. Install with: brew install ffmpeg"
    exit 1
fi

if ! command -v claude &> /dev/null; then
    log_warn "Claude Code CLI not found"
    exit 1
fi

if [ ! -f "$PRD_SOURCE" ]; then
    log_warn "PRD file not found: $PRD_SOURCE"
    exit 1
fi

log_info "All prerequisites met"

# Setup instructions
echo ""
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  SETUP INSTRUCTIONS${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "For the best demo video, arrange your screen:"
echo ""
echo "  +------------------+------------------+"
echo "  |                  |                  |"
echo "  |   TERMINAL       |   BROWSER        |"
echo "  |   (this window)  |   (dashboard)    |"
echo "  |                  |                  |"
echo "  +------------------+------------------+"
echo ""
echo "The dashboard will open at: http://127.0.0.1:57374/dashboard/index.html"
echo ""
echo -e "${YELLOW}Recording will start in 10 seconds...${NC}"
echo "Press Ctrl+C now to cancel"
echo ""

for i in 10 9 8 7 6 5 4 3 2 1; do
    printf "\rStarting in %d...  " $i
    sleep 1
done
echo ""

# Create demo workspace
log_step "Creating demo workspace..."
mkdir -p "$DEMO_WORKSPACE"
cd "$DEMO_WORKSPACE"

# Initialize git
git init -q
git config user.email "demo@loki-mode.local"
git config user.name "Loki Demo"

# Copy PRD
cp "$PRD_SOURCE" ./PRD.md
git add PRD.md
git commit -m "Initial PRD" -q

# Copy Loki Mode skill to workspace
mkdir -p .claude/skills/loki-mode
cp "$PROJECT_DIR/SKILL.md" .claude/skills/loki-mode/
cp -r "$PROJECT_DIR/references" .claude/skills/loki-mode/ 2>/dev/null || true

log_info "Workspace ready: $DEMO_WORKSPACE"

# Start screen recording
log_step "Starting screen recording..."

# Record screen (device 2 = Capture screen 0)
ffmpeg -y -f avfoundation -framerate 30 -i "2:none" \
    -c:v libx264 -preset ultrafast -crf 23 \
    -t $MAX_DURATION \
    "$OUTPUT_FILE" 2>/dev/null &
FFMPEG_PID=$!

sleep 2

if ! kill -0 $FFMPEG_PID 2>/dev/null; then
    log_warn "Failed to start screen recording"
    log_info "Continuing without recording - you can use QuickTime manually"
    FFMPEG_PID=""
fi

log_info "Recording started (PID: $FFMPEG_PID)"

# Cleanup handler
cleanup() {
    echo ""
    log_warn "Stopping demo..."

    # Stop ffmpeg
    if [ -n "$FFMPEG_PID" ] && kill -0 $FFMPEG_PID 2>/dev/null; then
        kill -INT $FFMPEG_PID 2>/dev/null || true
        wait $FFMPEG_PID 2>/dev/null || true
    fi

    echo ""
    if [ -f "$OUTPUT_FILE" ]; then
        log_info "Video saved to: $OUTPUT_FILE"
        local size=$(du -h "$OUTPUT_FILE" | cut -f1)
        log_info "File size: $size"
    fi

    log_info "Demo workspace: $DEMO_WORKSPACE"
    exit 0
}

trap cleanup INT TERM

# Run Loki Mode
echo ""
log_step "Starting Loki Mode..."
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  LOKI MODE OUTPUT${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Run with dashboard enabled, skip prereqs (we already checked)
LOKI_SKIP_PREREQS=true \
LOKI_DASHBOARD=true \
LOKI_MAX_ITERATIONS=10 \
"$PROJECT_DIR/autonomy/run.sh" ./PRD.md

# Demo complete
cleanup
