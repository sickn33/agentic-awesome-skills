---
title: Use Proper Test Setup for DBOS
impact: LOW-MEDIUM
impactDescription: Ensures consistent test results with proper DBOS lifecycle management
tags: testing, go-test, setup, integration, mock
---

## Use Proper Test Setup for DBOS

DBOS applications can be tested with unit tests (mocking DBOSContext) or integration tests (real Postgres database).

**Incorrect (no lifecycle management between tests):**

```go
// Tests share state - results are inconsistent!
func TestOne(t *testing.T) {
	myWorkflow(ctx, "input")
}
func TestTwo(t *testing.T) {
	// Previous test's state leaks into this test
	myWorkflow(ctx, "input")
}
```

**Correct (unit testing with mocks):**

The `DBOSContext` interface is fully mockable. Use a mocking library like `testify/mock` or `mockery`:

```go
func TestWorkflow(t *testing.T) {
	mockCtx := mocks.NewMockDBOSContext(t)

	// Mock RunAsStep to return a canned value
	mockCtx.On("RunAsStep", mockCtx, mock.Anything, mock.Anything).
		Return("mock-result", nil)

	result, err := myWorkflow(mockCtx, "input")
	assert.NoError(t, err)
	assert.Equal(t, "expected", result)

	mockCtx.AssertExpectations(t)
}
```

**Correct (integration testing with Postgres):**

```go
func setupDBOS(t *testing.T) dbos.DBOSContext {
	t.Helper()
	databaseURL := os.Getenv("DBOS_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DBOS_TEST_DATABASE_URL not set")
	}

	ctx, err := dbos.NewDBOSContext(context.Background(), dbos.Config{
		AppName:     "test-" + t.Name(),
		DatabaseURL: databaseURL,
	})
	require.NoError(t, err)

	dbos.RegisterWorkflow(ctx, myWorkflow)

	err = dbos.Launch(ctx)
	require.NoError(t, err)

	t.Cleanup(func() {
		dbos.Shutdown(ctx, 10*time.Second)
	})
	return ctx
}

func TestWorkflowIntegration(t *testing.T) {
	ctx := setupDBOS(t)

	handle, err := dbos.RunWorkflow(ctx, myWorkflow, "test-input")
	require.NoError(t, err)

	result, err := handle.GetResult()
	require.NoError(t, err)
	assert.Equal(t, "expected-output", result)
}
```

Key points:
- Use `t.Cleanup` to ensure `Shutdown` is called after each test
- Use unique `AppName` per test to avoid collisions
- Mock `DBOSContext` for fast unit tests without Postgres
- Use real Postgres for integration tests that verify durable behavior

Reference: [Testing DBOS](https://docs.dbos.dev/golang/tutorials/testing)
