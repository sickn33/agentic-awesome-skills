#!/bin/bash
# Record Loki Mode demo with asciinema
# Usage: ./demo/record-demo.sh [simple-todo|full-stack]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEMO_TYPE="${1:-simple-todo}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Ensure recordings directory exists
mkdir -p "$SCRIPT_DIR/recordings"

# Output file
OUTPUT_FILE="$SCRIPT_DIR/recordings/loki-demo-$DEMO_TYPE-$TIMESTAMP.cast"

# Check for asciinema
ASCIINEMA_PATH=""
if command -v asciinema &> /dev/null; then
    ASCIINEMA_PATH="asciinema"
elif [ -f "$PROJECT_DIR/benchmarks/venv/bin/asciinema" ]; then
    ASCIINEMA_PATH="$PROJECT_DIR/benchmarks/venv/bin/asciinema"
else
    echo "Error: asciinema not found"
    echo "Install with: pip install asciinema"
    echo "Or use the venv: source benchmarks/venv/bin/activate"
    exit 1
fi

echo "============================================"
echo "  Loki Mode Demo Recording"
echo "============================================"
echo ""
echo "Demo type:   $DEMO_TYPE"
echo "Output file: $OUTPUT_FILE"
echo "Asciinema:   $ASCIINEMA_PATH"
echo ""
echo "Tips for recording:"
echo "  - Speak clearly if adding live narration"
echo "  - Pause at key moments"
echo "  - Type deliberately (viewers need to follow)"
echo ""
echo "Press Enter to start recording..."
read -r

# Record the demo
$ASCIINEMA_PATH rec \
    --title "Loki Mode Demo - $DEMO_TYPE" \
    --command "$SCRIPT_DIR/run-demo.sh $DEMO_TYPE" \
    --idle-time-limit 3 \
    "$OUTPUT_FILE"

echo ""
echo "============================================"
echo "  Recording Complete"
echo "============================================"
echo ""
echo "Saved to: $OUTPUT_FILE"
echo ""
echo "Next steps:"
echo "  1. Play back:  $ASCIINEMA_PATH play $OUTPUT_FILE"
echo "  2. Upload:     $ASCIINEMA_PATH upload $OUTPUT_FILE"
echo "  3. Convert to GIF: agg $OUTPUT_FILE demo.gif"
echo ""

# Create symlink to latest
ln -sf "$(basename "$OUTPUT_FILE")" "$SCRIPT_DIR/recordings/latest.cast"
echo "Latest recording linked to: $SCRIPT_DIR/recordings/latest.cast"
