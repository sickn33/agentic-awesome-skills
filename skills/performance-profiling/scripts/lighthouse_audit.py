#!/usr/bin/env python3
"""
Skill: performance-profiling
Script: lighthouse_audit.py
Purpose: Run Lighthouse performance audit on a URL
Usage: python lighthouse_audit.py https://example.com
Output: JSON with performance scores
Note: Requires lighthouse CLI (npm install -g lighthouse)
"""
import subprocess
import json
import sys
import os
import tempfile

def run_lighthouse(url: str) -> dict:
    """Run Lighthouse and preserve failure evidence without leaking temp reports."""
    output_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            output_path = f.name
        result = subprocess.run(
            ["lighthouse", url, "--output=json", f"--output-path={output_path}",
             "--chrome-flags=--headless",
             "--only-categories=performance,accessibility,best-practices,seo"],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            return {"error": "Lighthouse command failed", "returncode": result.returncode,
                    "stderr": result.stderr[:500]}
        with open(output_path, 'r') as f:
            report = json.load(f)
        categories = report.get("categories", {})
        if not isinstance(categories, dict):
            return {"error": "Invalid Lighthouse categories"}
        def score(name):
            category = categories.get(name, {})
            value = category.get("score") if isinstance(category, dict) else None
            return int(value * 100) if isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= value <= 1 else None
        return {
            "url": url,
            "scores": {name.replace("-", "_"): score(name) for name in
                       ("performance", "accessibility", "best-practices", "seo")},
            "summary": get_summary(categories)
        }
    except subprocess.TimeoutExpired:
        return {"error": "Lighthouse audit timed out"}
    except FileNotFoundError:
        return {"error": "Lighthouse CLI not found or report missing"}
    except (OSError, ValueError, TypeError, AttributeError):
        return {"error": "Lighthouse report could not be read as valid JSON"}
    finally:
        if output_path and os.path.exists(output_path):
            os.unlink(output_path)

def get_summary(categories: dict) -> str:
    """Generate summary based on scores."""
    category = categories.get("performance", {})
    score = category.get("score") if isinstance(category, dict) else None
    if not isinstance(score, (int, float)) or isinstance(score, bool) or not 0 <= score <= 1:
        return "[?] Performance score unavailable"
    perf = score * 100
    if perf >= 90:
        return "[OK] Excellent performance"
    elif perf >= 50:
        return "[!] Needs improvement"
    else:
        return "[X] Poor performance"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python lighthouse_audit.py <url>"}))
        sys.exit(1)
    
    result = run_lighthouse(sys.argv[1])
    print(json.dumps(result, indent=2))
    sys.exit(1 if "error" in result else 0)
