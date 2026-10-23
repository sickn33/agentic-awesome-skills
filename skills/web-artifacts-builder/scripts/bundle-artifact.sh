#!/bin/bash
set -euo pipefail
# Modified in catalog review: preserve previous output and use isolated staging.

echo "📦 Bundling React app to single HTML artifact..."

# Check if we're in a project directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: No package.json found. Run this script from your project root."
  exit 1
fi

# Check if index.html exists
if [ ! -f "index.html" ]; then
  echo "❌ Error: No index.html found in project root."
  echo "   This script requires an index.html entry point."
  exit 1
fi

# Install bundling dependencies
echo "📦 Installing bundling dependencies..."
pnpm add -D parcel @parcel/config-default parcel-resolver-tspaths html-inline

# Create Parcel config with tspaths resolver
if [ ! -f ".parcelrc" ]; then
  echo "🔧 Creating Parcel configuration with path alias support..."
  cat > .parcelrc << 'EOF'
{
  "extends": "@parcel/config-default",
  "resolvers": ["parcel-resolver-tspaths", "..."]
}
EOF
fi

# Never delete an existing build or artifact.
if [ -e bundle.html ] || [ -L bundle.html ]; then
  echo "bundle.html already exists; choose a new output directory" >&2; exit 1
fi
BUILD_DIR=$(mktemp -d "$PWD/.artifact-build.XXXXXX")
trap 'rm -rf -- "$BUILD_DIR"' EXIT

# Build with Parcel
echo "🔨 Building with Parcel..."
pnpm exec parcel build index.html --dist-dir "$BUILD_DIR/dist" --no-source-maps

# Inline everything into single HTML
echo "🎯 Inlining all assets into single HTML file..."
pnpm exec html-inline "$BUILD_DIR/dist/index.html" > "$BUILD_DIR/bundle.html"
# noclobber preserves a file created after the initial existence check.
(set -o noclobber; cat "$BUILD_DIR/bundle.html" > bundle.html)

# Get file size
FILE_SIZE=$(du -h bundle.html | cut -f1)

echo ""
echo "✅ Bundle complete!"
echo "📄 Output: bundle.html ($FILE_SIZE)"
echo ""
echo "You can now use this single HTML file as an artifact in Claude conversations."
echo "To test locally: open bundle.html in your browser"