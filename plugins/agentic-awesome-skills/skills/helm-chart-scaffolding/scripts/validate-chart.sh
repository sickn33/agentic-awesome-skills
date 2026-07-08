#!/bin/bash
set -e

CHART_DIR="${1:-.}"
RELEASE_NAME="test-release"

echo "═══════════════════════════════════════════════════════"
echo "  Helm Chart Validation"
echo "═══════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Helm is installed
if ! command -v helm &> /dev/null; then
    error "Helm is not installed"
    exit 1
fi

echo "📦 Chart directory: $CHART_DIR"
echo ""

# 1. Check chart structure
echo "1️⃣  Checking chart structure..."
if [ ! -f "$CHART_DIR/Chart.yaml" ]; then
    error "Chart.yaml not found"
    exit 1
fi
success "Chart.yaml exists"

if [ ! -f "$CHART_DIR/values.yaml" ]; then
    error "values.yaml not found"
    exit 1
fi
success "values.yaml exists"

if [ ! -d "$CHART_DIR/templates" ]; then
    error "templates/ directory not found"
    exit 1
fi
success "templates/ directory exists"
echo ""

# 2. Lint the chart
echo "2️⃣  Linting chart..."
if helm lint "$CHART_DIR"; then
    success "Chart passed lint"
else
    error "Chart failed lint"
    exit 1
fi
echo ""

# 3. Check Chart.yaml
echo "3️⃣  Validating Chart.yaml..."
CHART_NAME=$(grep "^name:" "$CHART_DIR/Chart.yaml" | awk '{print $2}')
CHART_VERSION=$(grep "^version:" "$CHART_DIR/Chart.yaml" | awk '{print $2}')
APP_VERSION=$(grep "^appVersion:" "$CHART_DIR/Chart.yaml" | awk '{print $2}' | tr -d '"')

if [ -z "$CHART_NAME" ]; then
    error "Chart name not found"
    exit 1
fi
success "Chart name: $CHART_NAME"

if [ -z "$CHART_VERSION" ]; then
    error "Chart version not found"
    exit 1
fi
success "Chart version: $CHART_VERSION"

if [ -z "$APP_VERSION" ]; then
    warning "App version not specified"
else
    success "App version: $APP_VERSION"
fi
echo ""

# 4. Test template rendering
echo "4️⃣  Testing template rendering..."
if helm template "$RELEASE_NAME" "$CHART_DIR" > /dev/null 2>&1; then
    success "Templates rendered successfully"
else
    error "Template rendering failed"
    helm template "$RELEASE_NAME" "$CHART_DIR"
    exit 1
fi
echo ""

# 5. Dry-run installation
echo "5️⃣  Testing dry-run installation..."
if helm install "$RELEASE_NAME" "$CHART_DIR" --dry-run --debug > /dev/null 2>&1; then
    success "Dry-run installation successful"
else
    error "Dry-run installation failed"
    exit 1
fi
echo ""

# 6. Check for required Kubernetes resources
echo "6️⃣  Checking generated resources..."
MANIFESTS=$(helm template "$RELEASE_NAME" "$CHART_DIR")

if echo "$MANIFESTS" | grep -q "kind: Deployment"; then
    success "Deployment found"
else
    warning "No Deployment found"
fi

if echo "$MANIFESTS" | grep -q "kind: Service"; then
    success "Service found"
else
    warning "No Service found"
fi

if echo "$MANIFESTS" | grep -q "kind: ServiceAccount"; then
    success "ServiceAccount found"
else
    warning "No ServiceAccount found"
fi
echo ""

# 7. Check for security best practices
echo "7️⃣  Checking security best practices..."
if echo "$MANIFESTS" | grep -q "runAsNonRoot: true"; then
    success "Running as non-root user"
else
    warning "Not explicitly running as non-root"
fi

if echo "$MANIFESTS" | grep -q "readOnlyRootFilesystem: true"; then
    success "Using read-only root filesystem"
else
    warning "Not using read-only root filesystem"
fi

if echo "$MANIFESTS" | grep -q "allowPrivilegeEscalation: false"; then
    success "Privilege escalation disabled"
else
    warning "Privilege escalation not explicitly disabled"
fi
echo ""

# 8. Check for resource limits
echo "8️⃣  Checking resource configuration..."
if echo "$MANIFESTS" | grep -q "resources:"; then
    if echo "$MANIFESTS" | grep -q "limits:"; then
        success "Resource limits defined"
    else
        warning "No resource limits defined"
    fi
    if echo "$MANIFESTS" | grep -q "requests:"; then
        success "Resource requests defined"
    else
        warning "No resource requests defined"
    fi
else
    warning "No resources defined"
fi
echo ""

# 9. Check for health probes
echo "9️⃣  Checking health probes..."
if echo "$MANIFESTS" | grep -q "livenessProbe:"; then
    success "Liveness probe configured"
else
    warning "No liveness probe found"
fi

if echo "$MANIFESTS" | grep -q "readinessProbe:"; then
    success "Readiness probe configured"
else
    warning "No readiness probe found"
fi
echo ""

# 10. Check dependencies
if [ -f "$CHART_DIR/Chart.yaml" ] && grep -q "^dependencies:" "$CHART_DIR/Chart.yaml"; then
    echo "🔟 Checking dependencies..."
    if helm dependency list "$CHART_DIR" > /dev/null 2>&1; then
        success "Dependencies valid"

        if [ -f "$CHART_DIR/Chart.lock" ]; then
            success "Chart.lock file present"
        else
            warning "Chart.lock file missing (run 'helm dependency update')"
        fi
    else
        error "Dependencies check failed"
    fi
    echo ""
fi

# 11. Check for values schema
if [ -f "$CHART_DIR/values.schema.json" ]; then
    echo "1️⃣1️⃣ Validating values schema..."
    success "values.schema.json present"

    # Validate schema if jq is available
    if command -v jq &> /dev/null; then
        if jq empty "$CHART_DIR/values.schema.json" 2>/dev/null; then
            success "values.schema.json is valid JSON"
        else
            error "values.schema.json contains invalid JSON"
            exit 1
        fi
    fi
    echo ""
fi

# Summary
echo "═══════════════════════════════════════════════════════"
echo "  Validation Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Chart: $CHART_NAME"
echo "Version: $CHART_VERSION"
if [ -n "$APP_VERSION" ]; then
    echo "App Version: $APP_VERSION"
fi
echo ""
success "All validations passed!"
echo ""
echo "Next steps:"
echo "  • helm package $CHART_DIR"
echo "  • helm install my-release $CHART_DIR"
echo "  • helm test my-release"
echo ""
