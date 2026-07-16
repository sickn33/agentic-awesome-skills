---
name: grpc-golang
description: "Build production-ready gRPC services in Go with mTLS, streaming, and observability. Use when designing Protobuf contracts with Buf or implementing secure service-to-service transport."
risk: safe
source: self
date_added: "2026-02-27"
---

# gRPC Golang (gRPC-Go)

## Overview

Comprehensive guide for designing and implementing production-grade gRPC services in Go. Covers contract standardization with Buf, transport layer security via mTLS, and deep observability with OpenTelemetry interceptors.

## Use this skill when

- Designing microservices communication with gRPC in Go.
- Building high-performance internal APIs using Protobuf.
- Implementing streaming workloads (unidirectional or bidirectional).
- Standardizing API contracts using Protobuf and Buf.
- Configuring mTLS for service-to-service authentication.

## Do not use this skill when

- Building pure REST/HTTP public APIs without gRPC requirements.
- Modifying legacy `.proto` files without the ability to introduce a new API version (e.g., `api.v2`) or ensure backward compatibility.
- Managing service mesh traffic routing (e.g., Istio/Linkerd), which is outside the application code scope.

## Step-by-Step Guide

1. **Confirm Technical Context**: Identify Go version, gRPC-Go version, and whether the project uses Buf or raw protoc.
2. **Confirm Requirements**: Identify mTLS needs, load patterns (unary/streaming), SLOs, and message size limits.
3. **Plan Schema**: Define package versioning (e.g., `api.v1`), resource types, and error mapping.
4. **Security Design**: Implement mTLS for service-to-service authentication.
5. **Observability**: Configure interceptors for tracing, metrics, and structured logging.
6. **Verification**: Always run `buf lint` and breaking change checks before finalizing code generation.

Refer to `resources/implementation-playbook.md` for detailed patterns, code examples, and anti-patterns.

## Examples

### Example 1: Defining a Service & Message (v1 API)

```proto
syntax = "proto3";
package api.v1;
option go_package = "github.com/org/repo/gen/api/v1;apiv1";

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
}

message User {
  string id = 1;
  string name = 2;
}

message GetUserRequest {
  string id = 1;
}

message GetUserResponse {
  User user = 1;
}
```

## Best Practices

- ✅ **Do:** Use Buf to standardize your toolchain and linting with `buf.yaml` and `buf.gen.yaml`.
- ✅ **Do:** Always use semantic versioning in package paths (e.g., `package api.v1`).
- ✅ **Do:** Enforce mTLS for all internal service-to-service communication.
- ✅ **Do:** Handle `ctx.Done()` in all streaming handlers to prevent resource leaks.
- ✅ **Do:** Map domain errors to standard gRPC status codes (e.g., `codes.NotFound`).
- ❌ **Don't:** Return raw internal error strings or stack traces to gRPC clients.
- ❌ **Don't:** Create a new `grpc.ClientConn` per request; always reuse connections.

## Troubleshooting

- **Error: Inconsistent Gen**: If the generated code does not match the schema, run `buf generate` and verify the `go_package` option.
- **Error: Context Deadline**: Check client timeouts and ensure the server is not blocking infinitely in streaming handlers.
- **Error: mTLS Handshake**: Ensure the CA certificate is correctly added to the `x509.CertPool` on both client and server sides.

## Limitations

- Does not cover service mesh traffic routing (Istio/Linkerd configuration).
- Does not cover gRPC-Web or browser-based gRPC integration.
- Assumes Go 1.21+ and gRPC-Go v1.60+; older versions may have different APIs (e.g., `grpc.Dial` vs `grpc.NewClient`).
- Does not cover L7 gRPC-aware load balancer configuration (e.g., Envoy, NGINX).
- Does not address Protobuf schema registry or large-scale schema governance beyond Buf lint.

## Resources

- `resources/implementation-playbook.md` for detailed patterns, code examples, and anti-patterns.
- [Google API Design Guide](https://cloud.google.com/apis/design)
- [Buf Docs](https://buf.build/docs)
- [gRPC-Go Docs](https://grpc.io/docs/languages/go/)
- [OpenTelemetry Go Instrumentation](https://opentelemetry.io/docs/instrumentation/go/)

## Related Skills

- @golang-pro - General Go patterns and performance optimization outside the gRPC layer.
- @go-concurrency-patterns - Advanced goroutine lifecycle management for streaming handlers.
- @api-design-principles - Resource naming and versioning strategy before writing `.proto` files.
- @docker-expert - Containerizing gRPC services and configuring TLS cert injection via Docker secrets.
