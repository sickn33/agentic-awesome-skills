#!/usr/bin/env python3
"""
aas_intent_router.py — Smart Intent Auto-Router and Prompt Context Formatter for AAS Core
"""
import os
import sys
import argparse

def main():
    parser = argparse.ArgumentParser(description="AAS Smart Intent Auto-Router")
    parser.add_argument("--prompt", type=str, required=True, help="Agent prompt or goal")
    parser.add_argument("--format", choices=["xml", "json", "system"], default="xml")
    args = parser.parse_args()

    print(f"Routing AAS skills for prompt: {args.prompt}")
    if args.format == "xml":
        print(f"<aas_skill_context status=\"active\" prompt=\"{args.prompt}\">")
        print("</aas_skill_context>")

if __name__ == "__main__":
    main()
