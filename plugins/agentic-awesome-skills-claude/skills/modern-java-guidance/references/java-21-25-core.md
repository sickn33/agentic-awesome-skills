# Modern Java 17 / 21 / 25+ Core Patterns

## 1. `record`, `sealed interface`, and Pattern Matching for `switch` (Java 17 / 21)

```java
import java.math.BigDecimal;

public sealed interface PaymentResult permits PaymentResult.Approved, PaymentResult.Declined {
    record Approved(String transactionId, BigDecimal amount) implements PaymentResult {}
    record Declined(String reason) implements PaymentResult {}
}

public class PaymentFormatter {
    public String format(PaymentResult result) {
        return switch (result) {
            case PaymentResult.Approved(var txId, var amount) ->
                "Approved %s ($%s)".formatted(txId, amount);
            case PaymentResult.Declined(var reason) ->
                "Declined: %s".formatted(reason);
        };
    }
}
```

---

## 2. `SequencedCollection` (`getFirst()`, `getLast()`, `reversed()`) (Java 21+)

```java
import java.util.List;

public class OrderHistory {
    public String latestOrderId(List<String> orderIds) {
        if (orderIds.isEmpty()) {
            throw new IllegalStateException("No orders found");
        }
        // ❌ Legacy: orderIds.get(orderIds.size() - 1)
        return orderIds.getLast();
    }
}
```

---

## 3. Virtual Threads for Blocking I/O (Java 21+)

Use `Executors.newVirtualThreadPerTaskExecutor()` for high-throughput blocking I/O tasks (HTTP calls, DB queries). Keep bounded pools or `Semaphore` when rate-limiting downstream resources or running CPU-bound work.

```java
import java.util.concurrent.Executors;

public class BatchDispatcher {
    public void dispatchAll(Runnable task1, Runnable task2) {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            executor.submit(task1);
            executor.submit(task2);
        }
    }
}
```
