# Web Protocol and Authentication Attack Patterns

## HTTP Request Smuggling

Look for:
- Inconsistent Content-Length and Transfer-Encoding headers
- Multiple parsing layers with different behaviors
- Load balancer/proxy configuration issues

## Authentication Bypass

Look for:
- Missing authentication checks on endpoints
- Weak password policies
- Session management flaws
- Token validation weaknesses

## Session Fixation

Look for:
- Session IDs not regenerated after login
- Session tokens in URLs
- Predictable session token generation

## CORS Misconfiguration

Look for:
- Overly permissive `Access-Control-Allow-Origin`
- Credentials allowed from untrusted origins
- Missing origin validation

## Cookie Security

Look for:
- Missing `Secure`, `HttpOnly`, `SameSite` flags
- Cookies transmitted over HTTP
- Sensitive data in cookies without encryption

## API Security

Look for:
- Missing rate limiting
- Insufficient input validation
- Broken object-level authorization (BOLA)
- Mass assignment vulnerabilities

## JWT Vulnerabilities

Look for:
- Weak signing algorithms
- Missing expiration checks
- Algorithm confusion attacks
- Insecure token storage
