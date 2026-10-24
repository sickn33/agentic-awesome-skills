#!/bin/bash

# AWS CDK Stack Validation Script
#
# This script performs meta-level validation of CDK stacks before deployment.
# Run this as part of pre-commit checks to ensure infrastructure quality.
#
# Focus areas:
# - CDK synthesis success validation
# - CloudFormation template size and resource count checks
# - Language detection and dependency verification
# - Integration with cdk-nag (recommended for comprehensive best practice checks)
#
# Supports CDK projects in multiple languages:
# - TypeScript/JavaScript (detects via package.json)
# - Python (detects via requirements.txt or setup.py)
# - Java (detects via pom.xml)
# - C# (detects via .csproj files)
# - Go (detects via go.mod)
#
# For comprehensive CDK best practice validation (IAM policies, security,
# naming conventions, etc.), use cdk-nag: https://github.com/cdklabs/cdk-nag
# cdk-nag provides suppression mechanisms and supports all CDK languages.

set -euo pipefail

PROJECT_ROOT="${CDK_PROJECT_ROOT:-$PWD}"
if [[ ! -d "$PROJECT_ROOT" ]]; then
    echo "CDK project directory does not exist: $PROJECT_ROOT" >&2
    exit 2
fi
cd "$PROJECT_ROOT"
PROJECT_ROOT="$(pwd -P)"
if [[ ! -f "$PROJECT_ROOT/cdk.json" ]]; then
    echo "Expected reviewed CDK project with cdk.json" >&2; exit 2
fi
command -v jq >/dev/null 2>&1 || { echo "jq is required" >&2; exit 2; }
SYNTH_DIR=$(mktemp -d)
trap 'rm -rf "$SYNTH_DIR"' EXIT

echo "🔍 AWS CDK Stack Validation"
echo "============================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation status
VALIDATION_PASSED=true

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
    VALIDATION_PASSED=false
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to print info
info() {
    echo "ℹ $1"
}

# Check if cdk is installed
if ! command -v cdk &> /dev/null; then
    error "AWS CDK CLI not found. Install with: npm install -g aws-cdk"
    exit 1
fi

success "AWS CDK CLI found"

# Detect CDK project language
detect_language() {
    if [ -f "${PROJECT_ROOT}/package.json" ]; then
        echo "typescript"
    elif [ -f "${PROJECT_ROOT}/requirements.txt" ] || [ -f "${PROJECT_ROOT}/setup.py" ]; then
        echo "python"
    elif [ -f "${PROJECT_ROOT}/pom.xml" ]; then
        echo "java"
    elif [ -f "${PROJECT_ROOT}/cdk.csproj" ] || find "${PROJECT_ROOT}" -maxdepth 2 -name "*.csproj" -print -quit 2>/dev/null | grep -q .; then
        echo "csharp"
    elif [ -f "${PROJECT_ROOT}/go.mod" ]; then
        echo "go"
    else
        echo "unknown"
    fi
}

CDK_LANGUAGE=$(detect_language)

case "$CDK_LANGUAGE" in
    typescript)
        info "Detected TypeScript/JavaScript CDK project"
        success "package.json found"
        ;;
    python)
        info "Detected Python CDK project"
        success "requirements.txt or setup.py found"
        ;;
    java)
        info "Detected Java CDK project"
        success "pom.xml found"
        ;;
    csharp)
        info "Detected C# CDK project"
        success ".csproj file found"
        ;;
    go)
        info "Detected Go CDK project"
        success "go.mod found"
        ;;
    unknown)
        warning "Could not detect CDK project language"
        warning "Proceeding with generic validation only"
        ;;
esac

echo ""
info "Running CDK synthesis..."

# Synthesize stacks
if cdk synth --quiet --output "$SYNTH_DIR"; then
    success "CDK synthesis successful"
else
    error "CDK synthesis failed"
    echo ""
    echo "Run 'cdk synth' for detailed error information"
    exit 1
fi

echo ""
info "Checking for cdk-nag integration..."

# Check if cdk-nag is being used for comprehensive validation
case "$CDK_LANGUAGE" in
    typescript)
        if grep -r "cdk-nag" "${PROJECT_ROOT}/package.json" 2>/dev/null | grep -q "."; then
            success "cdk-nag found in package.json"
        else
            warning "cdk-nag not found - recommended for comprehensive CDK validation"
            warning "Install with: npm install --save-dev cdk-nag"
            warning "See: https://github.com/cdklabs/cdk-nag"
        fi
        ;;
    python)
        if grep -r "cdk-nag" "${PROJECT_ROOT}/requirements.txt" 2>/dev/null | grep -q "."; then
            success "cdk-nag found in requirements.txt"
        elif grep -r "cdk-nag" "${PROJECT_ROOT}/setup.py" 2>/dev/null | grep -q "."; then
            success "cdk-nag found in setup.py"
        else
            warning "cdk-nag not found - recommended for comprehensive CDK validation"
            warning "Install with: pip install cdk-nag"
            warning "See: https://github.com/cdklabs/cdk-nag"
        fi
        ;;
    java)
        if grep -r "cdk-nag" "${PROJECT_ROOT}/pom.xml" 2>/dev/null | grep -q "."; then
            success "cdk-nag found in pom.xml"
        else
            warning "cdk-nag not found - recommended for comprehensive CDK validation"
            warning "See: https://github.com/cdklabs/cdk-nag"
        fi
        ;;
    csharp)
        if find "${PROJECT_ROOT}" -maxdepth 2 -name "*.csproj" -exec grep -l "CdkNag" {} \; 2>/dev/null | grep -q "."; then
            success "cdk-nag found in .csproj"
        else
            warning "cdk-nag not found - recommended for comprehensive CDK validation"
            warning "See: https://github.com/cdklabs/cdk-nag"
        fi
        ;;
    go)
        if grep -r "cdk-nag-go" "${PROJECT_ROOT}/go.mod" 2>/dev/null | grep -q "."; then
            success "cdk-nag-go found in go.mod"
        else
            warning "cdk-nag-go not found - recommended for comprehensive CDK validation"
            warning "See: https://github.com/cdklabs/cdk-nag-go"
        fi
        ;;
esac

success "Integration checks completed"

echo ""
info "💡 Note: This script focuses on template and meta-level validation."
info "For comprehensive CDK best practice checks (IAM, security, naming, etc.),"
info "use cdk-nag: https://github.com/cdklabs/cdk-nag"

echo ""
info "Checking synthesized templates..."

# Get list of synthesized templates
TEMPLATES=()
while IFS= read -r -d '' file; do
    TEMPLATES+=("$file")
done < <(find "${SYNTH_DIR}" -name "*.template.json" -print0 2>/dev/null)

if [ ${#TEMPLATES[@]} -eq 0 ]; then
    error "No CloudFormation templates found in cdk.out/"
    exit 1
fi

success "Found ${#TEMPLATES[@]} CloudFormation template(s)"

# Validate each template
for template in "${TEMPLATES[@]}"; do
    STACK_NAME="$(basename "$template" .template.json)"

    # Check template size
    TEMPLATE_SIZE="$(wc -c < "$template")"
    MAX_SIZE=51200 # 50KB warning threshold

    if [ "$TEMPLATE_SIZE" -gt "$MAX_SIZE" ]; then
        warning "${STACK_NAME}: Template size (${TEMPLATE_SIZE} bytes) is large"
        warning "Consider using nested stacks to reduce size"
    fi

    # Count resources
    if ! RESOURCE_COUNT="$(jq -er 'if (.Resources | type) == "object" then .Resources | length else error("Invalid Resources") end' "$template")"; then
        error "${STACK_NAME}: Invalid template JSON/Resources"
        continue
    fi

    if [ "$RESOURCE_COUNT" -gt 200 ]; then
        warning "${STACK_NAME}: High resource count (${RESOURCE_COUNT})"
        warning "Consider splitting into multiple stacks"
    else
        success "${STACK_NAME}: ${RESOURCE_COUNT} resources"
    fi
done

echo ""
echo "============================"

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}✓ Validation passed${NC}"
    echo ""
    info "Synthesis/meta checks passed only; deployment readiness and security are not established"
    exit 0
else
    echo -e "${RED}✗ Validation failed${NC}"
    echo ""
    error "Please fix the errors above before deploying"
    exit 1
fi
