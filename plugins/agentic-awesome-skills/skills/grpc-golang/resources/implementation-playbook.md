# gRPC Golang Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Schema Design Standards

### Protobuf Definition

- **Syntax**: Use proto3 only.
- **Versioning**: Use package versioning (e.g., `api.v1`).
- **Pagination**: Use `page_token` and `page_size` for list operations.
- **Timezone**: Always use `google.protobuf.Timestamp` with UTC values at the server level.
- **Idempotency**: Use idempotency keys or design side-effect-free methods to allow safe retries.
- **Validation**: Adopt a schema-level validation approach (e.g., Buf validation rules or `protoc-gen-validate`) and ensure generated code is enforced server-side.

```proto
syntax = "proto3";
package api.v1;
option go_package = "github.com/org/repo/gen/api/v1;apiv1";

import "google/protobuf/timestamp.proto";

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc WatchUsers(WatchUsersRequest) returns (stream UserEvent);
}

message User {
  string id = 1;
  string name = 2;
  string email = 3;
  google.protobuf.Timestamp created_at = 4;
}

message GetUserRequest {
  string id = 1;
}

message GetUserResponse {
  User user = 1;
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;
}

message WatchUsersRequest {
  // Empty; streams all user events from the current point.
}

message UserEvent {
  enum EventType {
    EVENT_TYPE_UNSPECIFIED = 0;
    EVENT_TYPE_CREATED = 1;
    EVENT_TYPE_UPDATED = 2;
    EVENT_TYPE_DELETED = 3;
  }
  EventType type = 1;
  User user = 2;
  google.protobuf.Timestamp occurred_at = 3;
}
```

## Code Generation

- **Toolchain**: Use `google.golang.org/protobuf/cmd/protoc-gen-go` and `protoc-gen-go-grpc`.
- **Management**: Use `buf.gen.yaml` to manage plugin versions and generation parameters.
- **Compatibility**: Ensure plugins use Protobuf Go v2 API (`google.golang.org/protobuf`). Do not mix with the deprecated v1 API (`github.com/golang/protobuf`).

### buf.gen.yaml Example

```yaml
version: v2
plugins:
  - remote: buf.build/protocolbuffers/go
    out: gen
    opt: paths=source_relative
  - remote: buf.build/grpc/go
    out: gen
    opt: paths=source_relative
```

## Server Implementation

### Full Server Setup with Graceful Shutdown

```go
package main

import (
	"context"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/grpc/keepalive"

	apiv1 "github.com/org/repo/gen/api/v1"
)

func main() {
	srv := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			recoveryInterceptor,
			loggingInterceptor,
			otelUnaryInterceptor,
		),
		grpc.KeepaliveParams(keepalive.ServerParameters{
			MaxConnectionIdle: 5 * time.Minute,
			Time:              1 * time.Minute,
			Timeout:           20 * time.Second,
		}),
		grpc.MaxRecvMsgSize(4<<20), // 4 MB
		grpc.MaxSendMsgSize(4<<20), // 4 MB
	)

	// Register application services.
	apiv1.RegisterUserServiceServer(srv, newUserService())

	// Register health check with fully-qualified service name.
	healthSrv := health.NewServer()
	healthpb.RegisterHealthServer(srv, healthSrv)
	healthSrv.SetServingStatus(
		"api.v1.UserService",
		healthpb.HealthCheckResponse_SERVING,
	)

	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("listen: %v", err)
	}

	// Graceful shutdown: GracefulStop with a fallback timeout to Stop.
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		log.Println("shutting down gRPC server...")
		healthSrv.SetServingStatus(
			"api.v1.UserService",
			healthpb.HealthCheckResponse_NOT_SERVING,
		)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		stopped := make(chan struct{})
		go func() {
			srv.GracefulStop()
			close(stopped)
		}()

		select {
		case <-stopped:
			log.Println("server stopped gracefully")
		case <-ctx.Done():
			log.Println("graceful stop timed out, forcing stop")
			srv.Stop()
		}
	}()

	log.Printf("gRPC server listening on %s", lis.Addr())
	if err := srv.Serve(lis); err != nil {
		log.Fatalf("serve: %v", err)
	}
}
```

## mTLS Setup

```go
package main

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"log"
	"os"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

// loadServerTLS configures mTLS for the server side.
func loadServerTLS() grpc.ServerOption {
	tlsCert, err := tls.LoadX509KeyPair("server.crt", "server.key")
	if err != nil {
		log.Fatalf("load server cert: %v", err)
	}

	caCert, err := os.ReadFile("ca.crt")
	if err != nil {
		log.Fatalf("read CA cert: %v", err)
	}

	caPool := x509.NewCertPool()
	if !caPool.AppendCertsFromPEM(caCert) {
		log.Fatal("failed to append CA cert")
	}

	tlsCfg := &tls.Config{
		Certificates: []tls.Certificate{tlsCert},
		ClientCAs:    caPool,
		ClientAuth:   tls.RequireAndVerifyClientCert,
		MinVersion:   tls.VersionTLS13,
	}
	return grpc.Creds(credentials.NewTLS(tlsCfg))
}

// dialWithMTLS creates a client connection using mTLS.
func dialWithMTLS(target string) (*grpc.ClientConn, error) {
	clientCert, err := tls.LoadX509KeyPair("client.crt", "client.key")
	if err != nil {
		return nil, fmt.Errorf("load client cert: %w", err)
	}

	caCert, err := os.ReadFile("ca.crt")
	if err != nil {
		return nil, fmt.Errorf("read CA cert: %w", err)
	}

	caPool := x509.NewCertPool()
	if !caPool.AppendCertsFromPEM(caCert) {
		return nil, fmt.Errorf("failed to append CA cert")
	}

	creds := credentials.NewTLS(&tls.Config{
		Certificates: []tls.Certificate{clientCert},
		RootCAs:      caPool,
		MinVersion:   tls.VersionTLS13,
	})

	// Note: for gRPC-Go v1.63+, grpc.NewClient is the recommended replacement.
	conn, err := grpc.Dial(target, grpc.WithTransportCredentials(creds))
	if err != nil {
		return nil, fmt.Errorf("dial %s: %w", target, err)
	}
	return conn, nil
}
```

## Client Best Practices

### Connection Reuse

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"

	apiv1 "github.com/org/repo/gen/api/v1"
)

// Initialize once at startup; reuse across the application lifetime.
var userConn *grpc.ClientConn

func initClients(creds credentials.TransportCredentials) {
	var err error
	// Note: for gRPC-Go v1.63+, use grpc.NewClient instead.
	userConn, err = grpc.Dial(
		os.Getenv("USER_SVC_ADDR"),
		grpc.WithTransportCredentials(creds),
	)
	if err != nil {
		log.Fatalf("dial user-svc: %v", err)
	}
}

func callListUsers(ctx context.Context) (*apiv1.ListUsersResponse, error) {
	// Always set a deadline per call, not per connection.
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	client := apiv1.NewUserServiceClient(userConn)
	resp, err := client.ListUsers(ctx, &apiv1.ListUsersRequest{PageSize: 20})
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	return resp, nil
}
```

### Retry Policy

Only enable retries for idempotent calls. Use exponential backoff.

```go
import "google.golang.org/grpc"

// Service config with retry policy for idempotent methods.
const retryPolicy = `{
  "methodConfig": [{
    "name": [{"service": "api.v1.UserService", "method": "GetUser"}],
    "retryPolicy": {
      "maxAttempts": 3,
      "initialBackoff": "0.1s",
      "maxBackoff": "1s",
      "backoffMultiplier": 2,
      "retryableStatusCodes": ["UNAVAILABLE", "DEADLINE_EXCEEDED"]
    }
  }]
}`

// Note: for gRPC-Go v1.63+, use grpc.NewClient instead of grpc.Dial.
conn, err := grpc.Dial(
	target,
	grpc.WithTransportCredentials(creds),
	grpc.WithDefaultServiceConfig(retryPolicy),
)
```

## Observability

### Interceptor Labels

- **Logging**: Include `grpc.method`, `grpc.service`, `grpc.code`, `latency_ms`, and `trace_id`.
- **Metrics**: Export request count, latency histogram, and in-flight stream count.

### OpenTelemetry Integration

```go
import (
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"google.golang.org/grpc"
)

srv := grpc.NewServer(
	grpc.StatsHandler(otelgrpc.NewServerHandler()),
)

// Note: for gRPC-Go v1.63+, use grpc.NewClient instead of grpc.Dial.
conn, err := grpc.Dial(
	target,
	grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
)
```

## Testing

### bufconn In-Process Test

```go
package service_test

import (
	"context"
	"net"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/test/bufconn"

	apiv1 "github.com/org/repo/gen/api/v1"
)

func TestListUsers(t *testing.T) {
	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	apiv1.RegisterUserServiceServer(srv, &fakeUserSvc{})
	go func() {
		if err := srv.Serve(lis); err != nil {
			t.Logf("server exited: %v", err)
		}
	}()
	t.Cleanup(srv.GracefulStop)

	// Note: for gRPC-Go v1.63+, use grpc.NewClient instead of grpc.DialContext.
	conn, err := grpc.DialContext(context.Background(),
		"bufnet",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) {
			return lis.DialContext(ctx)
		}),
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		t.Fatalf("dial bufnet: %v", err)
	}
	t.Cleanup(func() { conn.Close() })

	client := apiv1.NewUserServiceClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	resp, err := client.ListUsers(ctx, &apiv1.ListUsersRequest{PageSize: 10})
	if code := status.Code(err); code != codes.OK {
		t.Fatalf("expected OK, got %v: %v", code, err)
	}
	if resp == nil {
		t.Fatal("expected non-nil response")
	}
}
```

## Streaming Handler Pattern

Always check `ctx.Done()` in streaming loops. Never expose raw internal errors to clients.

```go
func (s *userService) WatchUsers(
	req *apiv1.WatchUsersRequest,
	stream apiv1.UserService_WatchUsersServer,
) error {
	ctx := stream.Context()

	events := s.subscribeUserEvents()
	defer s.unsubscribe(events)

	for {
		select {
		case <-ctx.Done():
			// Client disconnected or deadline exceeded; exit cleanly.
			return status.Error(codes.Canceled, "client disconnected")

		case event, ok := <-events:
			if !ok {
				// Channel closed; server is shutting down.
				return status.Error(codes.Unavailable, "service shutting down")
			}

			if err := stream.Send(event); err != nil {
				// Log the raw error server-side for diagnostics.
				log.Printf("stream send failed: %v", err)
				// Return a generic message to the client; never leak raw err.
				return status.Error(codes.Internal, "failed to send event")
			}
		}
	}
}
```

## Error Mapping

Map domain errors to gRPC status codes consistently:

Only return `err.Error()` to clients when it is a safe, user-facing domain message (not an internal error string).

```go
package service

import (
	"errors"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var (
	ErrNotFound       = errors.New("resource not found")
	ErrAlreadyExists  = errors.New("resource already exists")
	ErrInvalidInput   = errors.New("invalid input")
	ErrPermission     = errors.New("permission denied")
)

// toGRPCError maps a domain error to a gRPC status error.
func toGRPCError(err error) error {
	if err == nil {
		return nil
	}
	switch {
	case errors.Is(err, ErrNotFound):
		return status.Error(codes.NotFound, err.Error())
	case errors.Is(err, ErrAlreadyExists):
		return status.Error(codes.AlreadyExists, err.Error())
	case errors.Is(err, ErrInvalidInput):
		return status.Error(codes.InvalidArgument, err.Error())
	case errors.Is(err, ErrPermission):
		return status.Error(codes.PermissionDenied, err.Error())
	default:
		return status.Error(codes.Internal, "internal error")
	}
}
```

## Project Layout

```
project/
  buf.gen.yaml
  buf.yaml
  proto/
    api/
      v1/
        user_service.proto
  gen/                          # Generated code (committed or gitignored)
    api/
      v1/
        user_service.pb.go
        user_service_grpc.pb.go
  internal/
    service/
      user.go                  # Service implementation
      user_test.go             # bufconn tests
    domain/
      errors.go                # Domain error definitions
  cmd/
    server/
      main.go                  # Server entrypoint with graceful shutdown
  config/
    config.go                  # Env-based config (timeouts, TLS paths, limits)
```

## Safety Checklist

- Default to TLS/mTLS for all production traffic.
- Enforce limits (`MaxRecvMsgSize`, `MaxSendMsgSize`, metadata size) to reduce resource exhaustion.
- Treat client-sent metadata as untrusted; validate and allowlist keys used for auth or tenant routing.
- Disable gRPC reflection in production to avoid exposing internal service schemas.
- Check `context.Done()` in every iteration of a streaming handler to prevent goroutine leaks.

## Anti-Patterns

| Anti-Pattern                                  | Why It Hurts                                                                                  | Fix                                                          |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Create new `grpc.ClientConn` per request      | Exhausts OS sockets and disables HTTP/2 multiplexing, causing high latency and resource leaks | Initialize once, reuse globally                              |
| Mix Protobuf v1 and v2 libraries              | Causes silent marshaling bugs; `proto.Marshal` from v1 and v2 are NOT interchangeable         | Pin to `google.golang.org/protobuf` (v2) throughout          |
| Expose raw internal error strings to clients  | Leaks stack traces and internal service names; a security and UX risk                         | Map errors with `status.Errorf` using appropriate gRPC codes |
| Ignore `context.Done()` in streaming handlers | Goroutine and connection leak when client disconnects                                         | Check `ctx.Err()` in every iteration of a streaming loop     |
| Skip error handling with `_ =`                | Hides failures silently; production outages become undiagnosable                              | Always check and handle errors explicitly                    |
| Use `grpc.Dial` without health checks         | Connection failures are deferred and may surface as runtime errors                            | Use health checks and monitor connection state               |

> **Migration note**: For gRPC-Go v1.63+ (Jan 2024), `grpc.NewClient` is the newer API recommended by the gRPC-Go project for new code. For older versions (or when following existing codebases and official grpc.io examples), using `grpc.Dial` / `grpc.DialContext` is still common.
