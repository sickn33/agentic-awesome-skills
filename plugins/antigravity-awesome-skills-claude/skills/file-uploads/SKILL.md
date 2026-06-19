---
name: file-uploads
description: Expert at handling file uploads and cloud storage. Covers S3,
  Cloudflare R2, presigned URLs, multipart uploads, and image optimization.
  Knows how to handle large files without blocking.
risk: none
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# File Uploads & Storage

Expert at handling file uploads and cloud storage. Covers S3,
Cloudflare R2, presigned URLs, multipart uploads, and image
optimization. Knows how to handle large files without blocking.

**Role**: File Upload Specialist

Careful about security and performance. Never trusts file
extensions. Knows that large uploads need special handling.
Prefers presigned URLs over server proxying.

### Principles

- Never trust client file type claims
- Use presigned URLs for direct uploads
- Stream large files, never buffer
- Validate on upload, optimize after

## Sharp Edges

### Trusting client-provided file type

Severity: CRITICAL

Situation: User uploads malware.exe renamed to image.jpg. You check
extension, looks fine. Store it. Serve it. Another user
downloads and executes it.

Symptoms:
- Malware uploaded as images
- Wrong content-type served

Why this breaks:
File extensions and Content-Type headers can be faked.
Attackers rename executables to bypass filters.

Recommended fix:

# CHECK MAGIC BYTES

import { fileTypeFromBuffer } from "file-type";

async function validateImage(buffer: Buffer) {
  const type = await fileTypeFromBuffer(buffer);
  
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  
  if (!type || !allowedTypes.includes(type.mime)) {
    throw new Error("Invalid file type");
  }
  
  return type;
}

// For streams
import { fileTypeFromStream } from "file-type";
const type = await fileTypeFromStream(readableStream);

### No upload size restrictions

Severity: HIGH

Situation: No file size limit. Attacker uploads 10GB file. Server runs
out of memory or disk. Denial of service. Or massive
storage bill.

Symptoms:
- Server crashes on large uploads
- Massive storage bills
- Memory exhaustion

Why this breaks:
Without limits, attackers can exhaust resources. Even
legitimate users might accidentally upload huge files.

Recommended fix:

# SET SIZE LIMITS

// Formidable
const form = formidable({
  maxFileSize: 10 * 1024 * 1024, // 10MB
});

// Multer
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Client-side early check
if (file.size > 10 * 1024 * 1024) {
  alert("File too large (max 10MB)");
  return;
}

// Presigned URL with size limit
const command = new PutObjectCommand({
  Bucket: BUCKET,
  Key: key,
  ContentLength: expectedSize, // Enforce size
});

### User-controlled filename allows path traversal

Severity: CRITICAL

Situation: User uploads file named "../../../etc/passwd". You use
filename directly. File saved outside upload directory.
System files overwritten.

Symptoms:
- Files outside upload directory
- System file access

Why this breaks:
User input should never be used directly in file paths.
Path traversal sequences can escape intended directories.

Recommended fix:

# SANITIZE FILENAMES

import path from "path";
import crypto from "crypto";

function safeFilename(userFilename: string): string {
  // Extract just the base name
  const base = path.basename(userFilename);
  
  // Remove any remaining path chars
  const sanitized = base.replace(/[^a-zA-Z0-9.-]/g, "_");
  
  // Or better: generate new name entirely
  const ext = path.extname(userFilename).toLowerCase();
  const allowed = [".jpg", ".png", ".pdf"];
  
  if (!allowed.includes(ext)) {
    throw new Error("Invalid extension");
  }
  
  return crypto.randomUUID() + ext;
}

// Never do this
const path = "uploads/" + req.body.filename; // DANGER!

// Do this
const path = "uploads/" + safeFilename(req.body.filename);

### Presigned URL shared or cached incorrectly

Severity: MEDIUM

Situation: Presigned URL for private file returned in API response.
Response cached by CDN. Anyone with cached URL can access
private file for hours.

Symptoms:
- Private files accessible via cached URLs
- Access after expiry

Why this breaks:
Presigned URLs grant temporary access. If cached or shared,
access extends beyond intended scope.

Recommended fix:

# CONTROL PRESIGNED URL DISTRIBUTION

// Short expiry for sensitive files
const url = await getSignedUrl(s3, command, {
  expiresIn: 300, // 5 minutes
});

// No-cache headers for presigned URL responses
return Response.json({ url }, {
  headers: {
    "Cache-Control": "no-store, max-age=0",
  },
});

// Or use CloudFront signed URLs for more control

## Validation Checks

### Only checking file extension

Severity: CRITICAL

Message: Check magic bytes, not just extension

Fix action: Use file-type library to verify actual type

### User filename used directly in path

Severity: CRITICAL

Message: Sanitize filenames to prevent path traversal

Fix action: Use path.basename() and generate safe name

## Collaboration

### Delegation Triggers

- image optimization CDN -> performance-optimization (Image delivery)
- storing file metadata -> postgres-wizard (Database schema)

## When to Use
- User mentions or implies: file upload
- User mentions or implies: S3
- User mentions or implies: R2
- User mentions or implies: presigned URL
- User mentions or implies: multipart
- User mentions or implies: image upload
- User mentions or implies: cloud storage

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
