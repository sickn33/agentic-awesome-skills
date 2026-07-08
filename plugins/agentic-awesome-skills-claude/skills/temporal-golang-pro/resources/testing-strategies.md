# Temporal Go Testing Strategies

Testing workflows and activities in Go requires a deep understanding of the `testsuite` package, which provides a mocked environment with deterministic time-skipping.

## The Test Suite Setup

Always use the `WorkflowTestSuite` to maintain state across multiple tests in a file.

```go
// Requires: "github.com/stretchr/testify/suite", "go.temporal.io/sdk/testsuite"
type MyTestSuite struct {
    suite.Suite
    testsuite.WorkflowTestSuite
    env *testsuite.TestWorkflowEnvironment
}

func (s *MyTestSuite) SetupTest() {
    s.env = s.NewTestWorkflowEnvironment()
}

func TestMyTestSuite(t *testing.T) {
    suite.Run(t, new(MyTestSuite))
}
```

## 1. Unit Testing Workflows

The most powerful feature of the Go SDK is **Time-skipping**. A workflow that sleeps for 30 days will finish in milliseconds in your test.

### Mocking Activities

You must register activity mocks before running the workflow.

```go
func (s *MyTestSuite) Test_SuccessfulWorkflow() {
    // Mock the activity
    s.env.OnActivity(MyActivity, mock.Anything, "input").Return("output", nil)

    s.env.ExecuteWorkflow(MyWorkflow, "input")

    s.True(s.env.IsWorkflowCompleted())
    s.NoError(s.env.GetWorkflowError())

    var result string
    s.env.GetWorkflowResult(&result)
    s.Equal("Completed", result)
}
```

### Mocking Child Workflows

Similar to activities, use `OnChildWorkflow`.

```go
s.env.OnChildWorkflow(MyChildWorkflow, mock.Anything, "args").Return("result", nil)
```

## 2. Unit Testing Activities

Use `TestActivityEnvironment` to test activities in isolation.

```go
// Requires: "go.temporal.io/sdk/testsuite", "github.com/stretchr/testify/assert"
func Test_Activity(t *testing.T) {
    testSuite := &testsuite.WorkflowTestSuite{}
    env := testSuite.NewTestActivityEnvironment()

    env.RegisterActivity(MyActivity)

    val, err := env.ExecuteActivity(MyActivity, "input")
    assert.NoError(t, err)

    var result string
    val.Get(&result)
    assert.Equal(t, "expected", result)
}
```

## 3. Replay Testing (Determinism Check)

Replay testing ensures that new code changes won't break existing, running workflows.

```go
func Test_ReplayStaticHistory(t *testing.T) {
    replayer := worker.NewWorkflowReplayer()

    replayer.RegisterWorkflow(MyWorkflow)

    // Load history from JSON file (exported from Temporal Web UI or CLI).
    // Web UI: Workflow Detail -> Download History (JSON)
    // CLI:    temporal workflow show --workflow-id <id> --namespace <ns> --output json > history.json
    err := replayer.ReplayWorkflowHistoryFromJSONFile(
        worker.ReplayWorkflowHistoryFromJSONFileOptions{},
        "history.json",
    )
    assert.NoError(t, err)
}
```

## 4. Testing Signals and Queries

You can send signals during a test at specific points in time.

```go
func (s *MyTestSuite) Test_WorkflowWithSignal() {
    // Delayed signal
    s.env.RegisterDelayedCallback(func() {
        s.env.SignalWorkflow("my-signal", "data")
    }, time.Hour) // This hour passes instantly!

    s.env.ExecuteWorkflow(MyWorkflow)

    // Query state after signal
    res, err := s.env.QueryWorkflow("get-state")
    s.NoError(err)
    var state string
    res.Get(&state)
    s.Equal("SignalReceived", state)
}
```

## Best Practices for Testing

- **>=80% Coverage**: Aim for high coverage on workflow logic since activities are often just wrappers around DB/API calls.
- **Assertion-based**: Use `testify/assert` or `testify/suite` for clean assertions.
- **Mock Everything External**: Never call a real database or API in a unit test.
- **Test Failure Paths**: Explicitly test what happens when an activity returns an error or when a heartbeat times out.

### Example: Testing an Activity Failure Path

```go
func (s *MyTestSuite) Test_WorkflowHandlesActivityError() {
    // Mock the activity to return a non-retryable error
    s.env.OnActivity(ChargePaymentActivity, mock.Anything, mock.Anything).
        Return("", temporal.NewNonRetryableApplicationError("card declined", "PaymentError", nil))

    s.env.ExecuteWorkflow(SubscriptionWorkflow, "user-123")

    s.True(s.env.IsWorkflowCompleted())
    // Verify the workflow correctly surfaces the error
    err := s.env.GetWorkflowError()
    s.Error(err)
    s.Contains(err.Error(), "card declined")
}
```
