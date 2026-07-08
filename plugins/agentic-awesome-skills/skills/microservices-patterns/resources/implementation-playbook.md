# Microservices Patterns Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Microservices Patterns

Master microservices architecture patterns including service boundaries, inter-service communication, data management, and resilience patterns for building distributed systems.

## Use this skill when

- Decomposing monoliths into microservices
- Designing service boundaries and contracts
- Implementing inter-service communication
- Managing distributed data and transactions
- Building resilient distributed systems
- Implementing service discovery and load balancing
- Designing event-driven architectures

## Do not use this skill when

- The system is small enough for a modular monolith
- You need a quick prototype without distributed complexity
- There is no operational support for distributed systems

## Instructions

1. Identify domain boundaries and ownership for each service.
2. Define contracts, data ownership, and communication patterns.
3. Plan resilience, observability, and deployment strategy.
4. Provide migration steps and operational guardrails.

## Core Concepts

### 1. Service Decomposition Strategies

**By Business Capability**

- Organize services around business functions
- Each service owns its domain
- Example: OrderService, PaymentService, InventoryService

**By Subdomain (DDD)**

- Core domain, supporting subdomains
- Bounded contexts map to services
- Clear ownership and responsibility

**Strangler Fig Pattern**

- Gradually extract from monolith
- New functionality as microservices
- Proxy routes to old/new systems

### 2. Communication Patterns

**Synchronous (Request/Response)**

- REST APIs
- gRPC
- GraphQL

**Asynchronous (Events/Messages)**

- Event streaming (Kafka)
- Message queues (RabbitMQ, SQS)
- Pub/Sub patterns

### 3. Data Management

**Database Per Service**

- Each service owns its data
- No shared databases
- Loose coupling

**Saga Pattern**

- Distributed transactions
- Compensating actions
- Eventual consistency

### 4. Resilience Patterns

**Circuit Breaker**

- Fail fast on repeated errors
- Prevent cascade failures

**Retry with Backoff**

- Transient fault handling
- Exponential backoff

**Bulkhead**

- Isolate resources
- Limit impact of failures

## Service Decomposition Patterns

### Pattern 1: By Business Capability

```python
# E-commerce example

# Order Service
class OrderService:
    """Handles order lifecycle."""

    async def create_order(self, order_data: dict) -> Order:
        order = Order.create(order_data)

        # Publish event for other services
        await self.event_bus.publish(
            OrderCreatedEvent(
                order_id=order.id,
                customer_id=order.customer_id,
                items=order.items,
                total=order.total
            )
        )

        return order

# Payment Service (separate service)
class PaymentService:
    """Handles payment processing."""

    async def process_payment(self, payment_request: PaymentRequest) -> PaymentResult:
        # Process payment
        result = await self.payment_gateway.charge(
            amount=payment_request.amount,
            customer=payment_request.customer_id
        )

        if result.success:
            await self.event_bus.publish(
                PaymentCompletedEvent(
                    order_id=payment_request.order_id,
                    transaction_id=result.transaction_id
                )
            )

        return result

# Inventory Service (separate service)
class InventoryService:
    """Handles inventory management."""

    async def reserve_items(self, order_id: str, items: List[OrderItem]) -> ReservationResult:
        # Check availability
        for item in items:
            available = await self.inventory_repo.get_available(item.product_id)
            if available < item.quantity:
                return ReservationResult(
                    success=False,
                    error=f"Insufficient inventory for {item.product_id}"
                )

        # Reserve items
        reservation = await self.create_reservation(order_id, items)

        await self.event_bus.publish(
            InventoryReservedEvent(
                order_id=order_id,
                reservation_id=reservation.id
            )
        )

        return ReservationResult(success=True, reservation=reservation)
```

### Pattern 2: API Gateway

```python
from fastapi import FastAPI, HTTPException, Depends
import httpx
from circuitbreaker import circuit

app = FastAPI()

class APIGateway:
    """Central entry point for all client requests."""

    def __init__(self):
        self.order_service_url = "http://order-service:8000"
        self.payment_service_url = "http://payment-service:8001"
        self.inventory_service_url = "http://inventory-service:8002"
        self.http_client = httpx.AsyncClient(timeout=5.0)

    @circuit(failure_threshold=5, recovery_timeout=30)
    async def call_order_service(self, path: str, method: str = "GET", **kwargs):
        """Call order service with circuit breaker."""
        response = await self.http_client.request(
            method,
            f"{self.order_service_url}{path}",
            **kwargs
        )
        response.raise_for_status()
        return response.json()

    async def create_order_aggregate(self, order_id: str) -> dict:
        """Aggregate data from multiple services."""
        # Parallel requests
        order, payment, inventory = await asyncio.gather(
            self.call_order_service(f"/orders/{order_id}"),
            self.call_payment_service(f"/payments/order/{order_id}"),
            self.call_inventory_service(f"/reservations/order/{order_id}"),
            return_exceptions=True
        )

        # Handle partial failures
        result = {"order": order}
        if not isinstance(payment, Exception):
            result["payment"] = payment
        if not isinstance(inventory, Exception):
            result["inventory"] = inventory

        return result

@app.post("/api/orders")
async def create_order(
    order_data: dict,
    gateway: APIGateway = Depends()
):
    """API Gateway endpoint."""
    try:
        # Route to order service
        order = await gateway.call_order_service(
            "/orders",
            method="POST",
            json=order_data
        )
        return {"order": order}
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail="Order service unavailable")
```

## Communication Patterns

### Pattern 1: Synchronous REST Communication

```python
# Service A calls Service B
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

class ServiceClient:
    """HTTP client with retries and timeout."""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(5.0, connect=2.0),
            limits=httpx.Limits(max_keepalive_connections=20)
        )

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def get(self, path: str, **kwargs):
        """GET with automatic retries."""
        response = await self.client.get(f"{self.base_url}{path}", **kwargs)
        response.raise_for_status()
        return response.json()

    async def post(self, path: str, **kwargs):
        """POST request."""
        response = await self.client.post(f"{self.base_url}{path}", **kwargs)
        response.raise_for_status()
        return response.json()

# Usage
payment_client = ServiceClient("http://payment-service:8001")
result = await payment_client.post("/payments", json=payment_data)
```

### Pattern 2: Asynchronous Event-Driven

```python
# Event-driven communication with Kafka
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
import json
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class DomainEvent:
    event_id: str
    event_type: str
    aggregate_id: str
    occurred_at: datetime
    data: dict

class EventBus:
    """Event publishing and subscription."""

    def __init__(self, bootstrap_servers: List[str]):
        self.bootstrap_servers = bootstrap_servers
        self.producer = None

    async def start(self):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=self.bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode()
        )
        await self.producer.start()

    async def publish(self, event: DomainEvent):
        """Publish event to Kafka topic."""
        topic = event.event_type
        await self.producer.send_and_wait(
            topic,
            value=asdict(event),
            key=event.aggregate_id.encode()
        )

    async def subscribe(self, topic: str, handler: callable):
        """Subscribe to events."""
        consumer = AIOKafkaConsumer(
            topic,
            bootstrap_servers=self.bootstrap_servers,
            value_deserializer=lambda v: json.loads(v.decode()),
            group_id="my-service"
        )
        await consumer.start()

        try:
            async for message in consumer:
                event_data = message.value
                await handler(event_data)
        finally:
            await consumer.stop()

# Order Service publishes event
async def create_order(order_data: dict):
    order = await save_order(order_data)

    event = DomainEvent(
        event_id=str(uuid.uuid4()),
        event_type="OrderCreated",
        aggregate_id=order.id,
        occurred_at=datetime.now(),
        data={
            "order_id": order.id,
            "customer_id": order.customer_id,
            "total": order.total
        }
    )

    await event_bus.publish(event)

# Inventory Service listens for OrderCreated
async def handle_order_created(event_data: dict):
    """React to order creation."""
    order_id = event_data["data"]["order_id"]
    items = event_data["data"]["items"]

    # Reserve inventory
    await reserve_inventory(order_id, items)
```

### Pattern 3: Saga Pattern (Distributed Transactions)

```python
# Saga orchestration for order fulfillment
from enum import Enum
from typing import List, Callable

class SagaStep:
    """Single step in saga."""

    def __init__(
        self,
        name: str,
        action: Callable,
        compensation: Callable
    ):
        self.name = name
        self.action = action
        self.compensation = compensation

class SagaStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"

class OrderFulfillmentSaga:
    """Orchestrated saga for order fulfillment."""

    def __init__(self):
        self.steps: List[SagaStep] = [
            SagaStep(
                "create_order",
                action=self.create_order,
                compensation=self.cancel_order
            ),
            SagaStep(
                "reserve_inventory",
                action=self.reserve_inventory,
                compensation=self.release_inventory
            ),
            SagaStep(
                "process_payment",
                action=self.process_payment,
                compensation=self.refund_payment
            ),
            SagaStep(
                "confirm_order",
                action=self.confirm_order,
                compensation=self.cancel_order_confirmation
            )
        ]

    async def execute(self, order_data: dict) -> SagaResult:
        """Execute saga steps."""
        completed_steps = []
        context = {"order_data": order_data}

        try:
            for step in self.steps:
                # Execute step
                result = await step.action(context)
                if not result.success:
                    # Compensate
                    await self.compensate(completed_steps, context)
                    return SagaResult(
                        status=SagaStatus.FAILED,
                        error=result.error
                    )

                completed_steps.append(step)
                context.update(result.data)

            return SagaResult(status=SagaStatus.COMPLETED, data=context)

        except Exception as e:
            # Compensate on error
            await self.compensate(completed_steps, context)
            return SagaResult(status=SagaStatus.FAILED, error=str(e))

    async def compensate(self, completed_steps: List[SagaStep], context: dict):
        """Execute compensating actions in reverse order."""
        for step in reversed(completed_steps):
            try:
                await step.compensation(context)
            except Exception as e:
                # Log compensation failure
                print(f"Compensation failed for {step.name}: {e}")

    # Step implementations
    async def create_order(self, context: dict) -> StepResult:
        order = await order_service.create(context["order_data"])
        return StepResult(success=True, data={"order_id": order.id})

    async def cancel_order(self, context: dict):
        await order_service.cancel(context["order_id"])

    async def reserve_inventory(self, context: dict) -> StepResult:
        result = await inventory_service.reserve(
            context["order_id"],
            context["order_data"]["items"]
        )
        return StepResult(
            success=result.success,
            data={"reservation_id": result.reservation_id}
        )

    async def release_inventory(self, context: dict):
        await inventory_service.release(context["reservation_id"])

    async def process_payment(self, context: dict) -> StepResult:
        result = await payment_service.charge(
            context["order_id"],
            context["order_data"]["total"]
        )
        return StepResult(
            success=result.success,
            data={"transaction_id": result.transaction_id},
            error=result.error
        )

    async def refund_payment(self, context: dict):
        await payment_service.refund(context["transaction_id"])
```

## Resilience Patterns

### Circuit Breaker Pattern

```python
from enum import Enum
from datetime import datetime, timedelta
from typing import Callable, Any

class CircuitState(Enum):
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered

class CircuitBreaker:
    """Circuit breaker for service calls."""

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 30,
        success_threshold: int = 2
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold

        self.failure_count = 0
        self.success_count = 0
        self.state = CircuitState.CLOSED
        self.opened_at = None

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker."""

        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpenError("Circuit breaker is open")

        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result

        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        """Handle successful call."""
        self.failure_count = 0

        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.success_count = 0

    def _on_failure(self):
        """Handle failed call."""
        self.failure_count += 1

        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.opened_at = datetime.now()

        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            self.opened_at = datetime.now()

    def _should_attempt_reset(self) -> bool:
        """Check if enough time passed to try again."""
        return (
            datetime.now() - self.opened_at
            > timedelta(seconds=self.recovery_timeout)
        )

# Usage
breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=30)

async def call_payment_service(payment_data: dict):
    return await breaker.call(
        payment_client.process_payment,
        payment_data
    )
```

## Resources

- **references/service-decomposition-guide.md**: Breaking down monoliths
- **references/communication-patterns.md**: Sync vs async patterns
- **references/saga-implementation.md**: Distributed transactions
- **assets/circuit-breaker.py**: Production circuit breaker
- **assets/event-bus-template.py**: Kafka event bus implementation
- **assets/api-gateway-template.py**: Complete API gateway

## Best Practices

1. **Service Boundaries**: Align with business capabilities
2. **Database Per Service**: No shared databases
3. **API Contracts**: Versioned, backward compatible
4. **Async When Possible**: Events over direct calls
5. **Circuit Breakers**: Fail fast on service failures
6. **Distributed Tracing**: Track requests across services
7. **Service Registry**: Dynamic service discovery
8. **Health Checks**: Liveness and readiness probes

## Common Pitfalls

- **Distributed Monolith**: Tightly coupled services
- **Chatty Services**: Too many inter-service calls
- **Shared Databases**: Tight coupling through data
- **No Circuit Breakers**: Cascade failures
- **Synchronous Everything**: Tight coupling, poor resilience
- **Premature Microservices**: Starting with microservices
- **Ignoring Network Failures**: Assuming reliable network
- **No Compensation Logic**: Can't undo failed transactions
