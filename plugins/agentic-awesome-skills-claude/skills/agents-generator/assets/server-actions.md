# Server Actions / Backend

## Entry Point

{{ENTRY_POINT_DESCRIPTION}}

## Flow

{{REQUEST_FLOW}}

## {{RESPONSE_TYPE_TITLE}}

{{RESPONSE_TYPE}}

## Error Handling

{{ERROR_HANDLING}}

## Rate Limiting

{{RATE_LIMITING}}

## Generation Rules

- **ENTRY_POINT_DESCRIPTION**:
  - Server actions: main file(s), exported function(s), parameters.
  - API Routes: files in app/api/, HTTP methods, parameters.
  - NestJS: main controllers, guards, DTOs.
- **REQUEST_FLOW**: Numbered steps of a typical request flow (validation → rate limit → logic → response).
- **RESPONSE_TYPE_TITLE**: "DownloadResult", "ApiResponse", or the main response type name.
- **RESPONSE_TYPE**: Interface/type of the response, with comments on optional vs required fields.
- **ERROR_HANDLING**:
  - If ErrorCode enum exists: document it with all codes.
  - If GlobalExceptionFilter exists: document it.
  - If detectErrorCode or similar exists: document the heuristic.
- **RATE_LIMITING**: If rate-limit.ts or middleware exists: document mechanism, limits, expiry.
