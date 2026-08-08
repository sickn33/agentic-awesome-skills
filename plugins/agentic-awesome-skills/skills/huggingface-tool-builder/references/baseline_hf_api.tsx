#!/usr/bin/env tsx

/**
 * Ultra-simple Hugging Face API example (TSX).
 *
 * Fetches a small list of models from the HF API and prints raw JSON.
 * Uses HF_TOKEN for auth if the environment variable is set.
 */

const showHelp = () => {
  console.log(`Ultra-simple Hugging Face API example (TSX)

Usage:
  baseline_hf_api.tsx [limit]
  baseline_hf_api.tsx --help

Description:
  Fetches a small list of models from the HF API and prints raw JSON.
  Uses HF_TOKEN for auth if the environment variable is set.

Examples:
  baseline_hf_api.tsx
  baseline_hf_api.tsx 5
  HF_TOKEN=your_token baseline_hf_api.tsx 10
`);
};

const arg = process.argv[2];
if (arg === "--help") {
  showHelp();
  process.exit(0);
}

const limit = arg ?? "3";
if (!/^\d+$/.test(limit)) {
  console.error("Error: limit must be a number");
  process.exit(1);
}

const token = process.env.HF_TOKEN;
const headers: Record<string, string> = token
  ? { Authorization: `Bearer ${token}` }
  : {};

const url = `https://huggingface.co/api/models?limit=${limit}`;

(async () => {
  const res = await fetch(url, { headers });

  if (!res.ok) {
    console.error(`Error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const text = await res.text();
  process.stdout.write(text);
})();
