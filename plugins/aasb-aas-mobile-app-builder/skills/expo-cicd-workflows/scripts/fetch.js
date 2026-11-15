#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

const CACHE_DIRECTORY = resolve(import.meta.dirname, '.cache');
const DEFAULT_TTL_SECONDS = 15 * 60; // 15 minutes

export async function fetchCached(url) {
  await mkdir(CACHE_DIRECTORY, { recursive: true });

  const cacheFile = resolve(CACHE_DIRECTORY, hashUrl(url) + '.json');
  const cached = await loadCacheEntry(cacheFile);
  if (cached && cached.expires > Math.floor(Date.now() / 1000)) {
    return cached.data;
  }

  // Make request, with conditional If-None-Match if we have an ETag.
  // Cache-Control: max-age=0 overrides Node's default 'no-cache' to allow 304 responses.
  const response = await fetch(url, {
    headers: {
      'Cache-Control': 'max-age=0',
      ...(cached?.etag && { 'If-None-Match': cached.etag }),
    },
  });

  if (response.status === 304 && cached) {
    // Refresh expiration and return cached data
    const entry = { ...cached, expires: getExpires(response.headers) };
    await saveCacheEntry(cacheFile, entry);
    return cached.data;
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const etag = response.headers.get('etag');
  const data = await response.text();
  const expires = getExpires(response.headers);

  await saveCacheEntry(cacheFile, { url, etag, expires, data });

  return data;
}

function hashUrl(url) {
  return createHash('sha256').update(url).digest('hex').slice(0, 16);
}

async function loadCacheEntry(cacheFile) {
  try {
    return JSON.parse(await readFile(cacheFile, 'utf-8'));
  } catch {
    return null;
  }
}

async function saveCacheEntry(cacheFile, entry) {
  await writeFile(cacheFile, JSON.stringify(entry, null, 2));
}

function getExpires(headers) {
  const now = Math.floor(Date.now() / 1000);

  // Prefer Cache-Control: max-age
  const maxAgeSeconds = parseMaxAge(headers.get('cache-control'));
  if (maxAgeSeconds != null) {
    return now + maxAgeSeconds;
  }

  // Fall back to Expires header
  const expires = headers.get('expires');
  if (expires) {
    const expiresTime = Date.parse(expires);
    if (!Number.isNaN(expiresTime)) {
      return Math.floor(expiresTime / 1000);
    }
  }

  // Default TTL
  return now + DEFAULT_TTL_SECONDS;
}

function parseMaxAge(cacheControl) {
  if (!cacheControl) {
    return null;
  }
  const match = cacheControl.match(/max-age=(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

if (import.meta.main) {
  const url = process.argv[2];

  if (!url || url === '--help' || url === '-h') {
    console.log(`Usage: fetch <url>

Fetches a URL with HTTP caching (ETags + Cache-Control/Expires).
Default TTL: ${DEFAULT_TTL_SECONDS / 60} minutes.
Cache is stored in: ${CACHE_DIRECTORY}/`);
    process.exit(url ? 0 : 1);
  }

  const data = await fetchCached(url);
  console.log(data);
}
