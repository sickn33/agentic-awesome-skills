#!/usr/bin/env python3
"""
API Validator - Checks API endpoints for best practices.
Validates OpenAPI specs, response formats, and common issues.
"""
import sys
import json
import re
from pathlib import Path

# Fix Windows console encoding for Unicode output
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except AttributeError:
    pass  # Python < 3.7

def find_api_files(project_path: Path) -> list:
    """Find API-related files."""
    patterns = [
        "**/*api*.ts", "**/*api*.js", "**/*api*.py",
        "**/routes/*.ts", "**/routes/*.js", "**/routes/*.py",
        "**/controllers/*.ts", "**/controllers/*.js",
        "**/endpoints/*.ts", "**/endpoints/*.py",
        "**/*.openapi.json", "**/*.openapi.yaml",
        "**/swagger.json", "**/swagger.yaml",
        "**/openapi.json", "**/openapi.yaml"
    ]
    
    files = []
    for pattern in patterns:
        files.extend(project_path.glob(pattern))
    
    # Exclude node_modules, etc.
    return [f for f in files if not any(x in str(f) for x in ['node_modules', '.git', 'dist', 'build', '__pycache__'])]

def check_openapi_spec(file_path: Path) -> dict:
    """Check OpenAPI/Swagger specification."""
    issues = []
    passed = []
    
    try:
        content = file_path.read_text(encoding='utf-8')
        
        if file_path.suffix == '.json':
            spec = json.loads(content)
        else:
            # Basic YAML check
            if 'openapi:' in content or 'swagger:' in content:
                passed.append("[OK] OpenAPI/Swagger version defined")
            else:
                issues.append("[X] No OpenAPI version found")
            
            if 'paths:' in content:
                passed.append("[OK] Paths section exists")
            else:
                issues.append("[X] No paths defined")
            
            if 'components:' in content or 'definitions:' in content:
                passed.append("[OK] Schema components defined")
            
            return {'file': str(file_path), 'passed': passed, 'issues': issues, 'type': 'openapi'}
        
        # JSON OpenAPI checks
        if 'openapi' in spec or 'swagger' in spec:
            passed.append("[OK] OpenAPI version defined")
        
        if 'info' in spec:
            if 'title' in spec['info']:
                passed.append("[OK] API title defined")
            if 'version' in spec['info']:
                passed.append("[OK] API version defined")
            if 'description' not in spec['info']:
                issues.append("[!] API description missing")
        
        if 'paths' in spec:
            path_count = len(spec['paths'])
            passed.append(f"[OK] {path_count} endpoints defined")
            
            # Check each path
            for path, methods in spec['paths'].items():
                for method, details in methods.items():
                    if method in ['get', 'post', 'put', 'patch', 'delete']:
                        if 'responses' not in details:
                            issues.append(f"[X] {method.upper()} {path}: No responses defined")
                        if 'summary' not in details and 'description' not in details:
                            issues.append(f"[!] {method.upper()} {path}: No description")
        
    except Exception as e:
        issues.append(f"[X] Parse error: {e}")
    
    return {'file': str(file_path), 'passed': passed, 'issues': issues, 'type': 'openapi'}

def check_api_code(file_path: Path) -> dict:
    """Check API code for common issues."""
    issues = []
    passed = []
    
    try:
        content = file_path.read_text(encoding='utf-8')
        
        # Check for error handling
        error_patterns = [
            r'try\s*{', r'try:', r'\.catch\(',
            r'except\s+', r'catch\s*\('
        ]
        has_error_handling = any(re.search(p, content) for p in error_patterns)
        if has_error_handling:
            passed.append("[OK] Error handling present")
        else:
            issues.append("[X] No error handling found")
        
        # Check for status codes
        status_patterns = [
            r'status\s*\(\s*\d{3}\s*\)', r'statusCode\s*[=:]\s*\d{3}',
            r'HttpStatus\.', r'status_code\s*=\s*\d{3}',
            r'\.status\(\d{3}\)', r'res\.status\('
        ]
        has_status = any(re.search(p, content) for p in status_patterns)
        if has_status:
            passed.append("[OK] HTTP status codes used")
        else:
            issues.append("[!] No explicit HTTP status codes")
        
        # Check for validation
        validation_patterns = [
            r'validate', r'schema', r'zod', r'joi', r'yup',
            r'pydantic', r'@Body\(', r'@Query\('
        ]
        has_validation = any(re.search(p, content, re.I) for p in validation_patterns)
        if has_validation:
            passed.append("[OK] Input validation present")
        else:
            issues.append("[!] No input validation detected")
        
        # Check for auth middleware
        auth_patterns = [
            r'auth', r'jwt', r'bearer', r'token',
            r'middleware', r'guard', r'@Authenticated'
        ]
        has_auth = any(re.search(p, content, re.I) for p in auth_patterns)
        if has_auth:
            passed.append("[OK] Authentication/authorization detected")
        
        # Check for rate limiting
        rate_patterns = [r'rateLimit', r'throttle', r'rate.?limit']
        has_rate = any(re.search(p, content, re.I) for p in rate_patterns)
        if has_rate:
            passed.append("[OK] Rate limiting present")
        
        # Check for logging
        log_patterns = [r'console\.log', r'logger\.', r'logging\.', r'log\.']
        has_logging = any(re.search(p, content) for p in log_patterns)
        if has_logging:
            passed.append("[OK] Logging present")
        
    except Exception as e:
        issues.append(f"[X] Read error: {e}")
    
    return {'file': str(file_path), 'passed': passed, 'issues': issues, 'type': 'code'}

def main():
    target = sys.argv[1] if len(sys.argv) > 1 else "."
    project_path = Path(target)
    
    print("\n" + "=" * 60)
    print("  API VALIDATOR - Endpoint Best Practices Check")
    print("=" * 60 + "\n")
    
    api_files = find_api_files(project_path)
    
    if not api_files:
        print("[!] No API files found.")
        print("   Looking for: routes/, controllers/, api/, openapi.json/yaml")
        sys.exit(0)
    
    results = []
    for file_path in api_files[:15]:  # Limit
        if 'openapi' in file_path.name.lower() or 'swagger' in file_path.name.lower():
            result = check_openapi_spec(file_path)
        else:
            result = check_api_code(file_path)
        results.append(result)
    
    # Print results
    total_issues = 0
    total_passed = 0
    
    for result in results:
        print(f"\n[FILE] {result['file']} [{result['type']}]")
        for item in result['passed']:
            print(f"   {item}")
            total_passed += 1
        for item in result['issues']:
            print(f"   {item}")
            if item.startswith("[X]"):
                total_issues += 1
    
    print("\n" + "=" * 60)
    print(f"[RESULTS] {total_passed} passed, {total_issues} critical issues")
    print("=" * 60)
    
    if total_issues == 0:
        print("[OK] API validation passed")
        sys.exit(0)
    else:
        print("[X] Fix critical issues before deployment")
        sys.exit(1)

if __name__ == "__main__":
    main()
