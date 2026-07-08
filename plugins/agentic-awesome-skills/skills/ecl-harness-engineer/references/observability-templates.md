# Observability Templates

Templates for agent observability infrastructure.

Advanced profile only. Load this reference only when the user explicitly requests agent execution
traces, observability hooks, metrics, or debugging of long-running agent sessions. Do not create
`harness/trace` or observability hooks as part of the default core harness.

## Trace Format

Standard format for recording agent execution sessions.

```go
// harness/trace/format.go
package trace

import (
	"encoding/json"
	"os"
	"time"
)

// AgentTrace captures a complete agent execution session
type AgentTrace struct {
	SessionID    string          `json:"session_id"`
	AgentType    string          `json:"agent_type"`
	StartTime    time.Time       `json:"start_time"`
	EndTime      time.Time       `json:"end_time"`
	Prompt       string          `json:"prompt"`
	SystemPrompt string          `json:"system_prompt,omitempty"`
	WorkingDir   string          `json:"working_dir"`
	Messages     []MessageTrace  `json:"messages"`
	ToolCalls    []ToolTrace     `json:"tool_calls"`
	TokenUsage   TokenUsage      `json:"token_usage"`
	Outcome      Outcome         `json:"outcome"`
	Result       string          `json:"result,omitempty"`
	Error        string          `json:"error,omitempty"`
	Metadata     map[string]any  `json:"metadata,omitempty"`
}

type MessageTrace struct {
	ID        string    `json:"id,omitempty"`
	Role      string    `json:"role"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

type ToolTrace struct {
	ID        string          `json:"id"`
	Tool      string          `json:"tool"`
	Input     json.RawMessage `json:"input"`
	Output    string          `json:"output"`
	Duration  time.Duration   `json:"duration"`
	Timestamp time.Time       `json:"timestamp"`
	IsError   bool            `json:"is_error"`
	ErrCode   int             `json:"err_code,omitempty"`
}

type TokenUsage struct {
	InputTokens  int64 `json:"input_tokens"`
	OutputTokens int64 `json:"output_tokens"`
	TotalTokens  int64 `json:"total_tokens"`
}

type Outcome string

const (
	OutcomeSuccess      Outcome = "success"
	OutcomeError        Outcome = "error"
	OutcomeTimeout      Outcome = "timeout"
	OutcomeCancelled    Outcome = "cancelled"
	OutcomeMaxTurns     Outcome = "max_turns"
	OutcomeMaxToolCalls Outcome = "max_tool_calls"
)

// TraceBuilder constructs traces incrementally
type TraceBuilder struct {
	trace AgentTrace
}

func NewTraceBuilder(sessionID, agentType string) *TraceBuilder {
	return &TraceBuilder{
		trace: AgentTrace{
			SessionID: sessionID,
			AgentType: agentType,
			StartTime: time.Now(),
			Messages:  make([]MessageTrace, 0),
			ToolCalls: make([]ToolTrace, 0),
			Metadata:  make(map[string]any),
		},
	}
}

func (b *TraceBuilder) AddMessage(msg MessageTrace) { b.trace.Messages = append(b.trace.Messages, msg) }
func (b *TraceBuilder) AddToolCall(tc ToolTrace)     { b.trace.ToolCalls = append(b.trace.ToolCalls, tc) }

func (b *TraceBuilder) Build() AgentTrace {
	b.trace.EndTime = time.Now()
	return b.trace
}

func (t *AgentTrace) Export(path string) error {
	data, err := json.MarshalIndent(t, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func Load(path string) (*AgentTrace, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var trace AgentTrace
	return &trace, json.Unmarshal(data, &trace)
}
```

## Self-Test Framework

Framework for testing agent behavior with validation.

```go
// harness/selftest/runner.go
package selftest

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

// TestCase defines a single agent test
type TestCase struct {
	Name        string                `json:"name"`
	Category    string                `json:"category"`
	Prompt      string                `json:"prompt"`
	InitFiles   map[string]string     `json:"init_files,omitempty"`
	Timeout     time.Duration         `json:"timeout"`
	MaxTurns    int                   `json:"max_turns,omitempty"`
	Expected    *Expectations         `json:"expected,omitempty"`
	Validators  []Validator           `json:"-"`
}

type Expectations struct {
	Files     map[string]FileExpectation `json:"files,omitempty"`
	ToolCalls []ToolCallExpectation      `json:"tool_calls,omitempty"`
}

type FileExpectation struct {
	MustExist      bool     `json:"must_exist"`
	MustContain    []string `json:"must_contain,omitempty"`
	MustNotContain []string `json:"must_not_contain,omitempty"`
}

type ToolCallExpectation struct {
	Tool         string `json:"tool"`
	MustOccur    bool   `json:"must_occur,omitempty"`
	MustNotOccur bool   `json:"must_not_occur,omitempty"`
}

type Validator func(result *AgentResult) error

type AgentResult struct {
	TestName  string            `json:"test_name"`
	Success   bool              `json:"success"`
	Error     string            `json:"error,omitempty"`
	Duration  time.Duration     `json:"duration"`
	ToolCalls []ToolCallRecord  `json:"tool_calls"`
}

type ToolCallRecord struct {
	Tool     string          `json:"tool"`
	Input    json.RawMessage `json:"input"`
	Output   string          `json:"output"`
	IsError  bool            `json:"is_error"`
	Duration time.Duration   `json:"duration"`
}

type Runner struct {
	WorkDir        string
	DefaultTimeout time.Duration
}

func NewRunner(workDir string) *Runner {
	return &Runner{WorkDir: workDir, DefaultTimeout: 2 * time.Minute}
}

func (r *Runner) Run(ctx context.Context, tc TestCase) (*AgentResult, error) {
	result := &AgentResult{
		TestName:  tc.Name,
		ToolCalls: make([]ToolCallRecord, 0),
	}
	start := time.Now()
	defer func() { result.Duration = time.Since(start) }()

	// TODO: Integrate with actual agent execution
	return result, fmt.Errorf("not yet integrated with agent")
}
```

## Observability Hook

Hook that records tool calls for analysis and replay.

```go
// hooks/observability/observability.go
package observability

import (
	"encoding/json"
	"sync"
	"time"
)

type ToolTrace struct {
	Tool       string          `json:"tool"`
	Input      json.RawMessage `json:"input"`
	Output     string          `json:"output"`
	IsError    bool            `json:"is_error"`
	Duration   time.Duration   `json:"duration"`
	Timestamp  time.Time       `json:"timestamp"`
}

// TraceRecorder collects tool traces
type TraceRecorder struct {
	mu        sync.RWMutex
	traces    []ToolTrace
	sessionId string
	startTime time.Time
}

func NewTraceRecorder(sessionId string) *TraceRecorder {
	return &TraceRecorder{
		traces:    make([]ToolTrace, 0),
		sessionId: sessionId,
		startTime: time.Now(),
	}
}

func (r *TraceRecorder) Record(trace ToolTrace)  {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.traces = append(r.traces, trace)
}

func (r *TraceRecorder) GetTraces() []ToolTrace {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]ToolTrace, len(r.traces))
	copy(result, r.traces)
	return result
}

func (r *TraceRecorder) ExportJSON() ([]byte, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return json.MarshalIndent(map[string]any{
		"session_id": r.sessionId,
		"start_time": r.startTime,
		"end_time":   time.Now(),
		"traces":     r.traces,
	}, "", "  ")
}

// Summary returns aggregate statistics
func (r *TraceRecorder) Summary() TraceSummary {
	r.mu.RLock()
	defer r.mu.RUnlock()

	summary := TraceSummary{
		TotalCalls: len(r.traces),
		ToolCounts: make(map[string]int),
	}
	for _, t := range r.traces {
		summary.ToolCounts[t.Tool]++
		if t.IsError {
			summary.TotalErrors++
		}
		summary.TotalDuration += t.Duration
	}
	return summary
}

type TraceSummary struct {
	TotalCalls    int            `json:"total_calls"`
	TotalErrors   int            `json:"total_errors"`
	TotalDuration time.Duration  `json:"total_duration"`
	ToolCounts    map[string]int `json:"tool_counts"`
}
```

## Integration Pattern

To wire the observability hook into an existing agent:

```go
// In agent initialization:
recorder := observability.NewTraceRecorder(sessionId)
hook := observability.NewObservabilityHook(recorder)

// Register as PostToolUse hook
agent.AddPostToolUseHook(hook)

// After agent completes:
traces := recorder.GetTraces()
summary := recorder.Summary()
summary.Print()

// Export for analysis
data, _ := recorder.ExportJSON()
os.WriteFile("trace.json", data, 0644)
```
