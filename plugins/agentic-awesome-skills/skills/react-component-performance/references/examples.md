# Examples

## Isolate a ticking timer from a long list

**Scenario:** A message list re-renders every second because a timer (`elapsedMs`) lives in the parent component. This causes visible jank on large lists.

**Goal:** Keep UI identical but limit re-renders to the timer area.

**Before (problematic pattern):**

```tsx
function Messages({ items, isThinking, processingStartedAt }) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isThinking || !processingStartedAt) {
      setElapsedMs(0);
      return;
    }
    setElapsedMs(Date.now() - processingStartedAt);
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - processingStartedAt);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isThinking, processingStartedAt]);

  return (
    <div>
      {items.map((item) => (
        <MessageRow key={item.id} item={item} />
      ))}
      <div>{formatDurationMs(elapsedMs)}</div>
    </div>
  );
}
```

**After (isolated ticking state):**

```tsx
type WorkingIndicatorProps = {
  isThinking: boolean;
  processingStartedAt?: number | null;
};

const WorkingIndicator = memo(function WorkingIndicator({
  isThinking,
  processingStartedAt = null,
}: WorkingIndicatorProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isThinking || !processingStartedAt) {
      setElapsedMs(0);
      return;
    }
    setElapsedMs(Date.now() - processingStartedAt);
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - processingStartedAt);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isThinking, processingStartedAt]);

  return <div>{formatDurationMs(elapsedMs)}</div>;
});

function Messages({ items, isThinking, processingStartedAt }) {
  return (
    <div>
      {items.map((item) => (
        <MessageRow key={item.id} item={item} />
      ))}
      <WorkingIndicator
        isThinking={isThinking}
        processingStartedAt={processingStartedAt}
      />
    </div>
  );
}
```

**Why it helps:** Only the `WorkingIndicator` subtree re-renders every second. The list remains stable unless its props change.

**Optional follow-ups:**

- Wrap `MessageRow` in `memo` if props are stable.
- Use `useCallback` for handlers passed to rows to avoid re-render churn.
- Consider list virtualization if the list is very large.
