# Projection Patterns Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Projection Patterns

Comprehensive guide to building projections and read models for event-sourced systems.

## Do not use this skill when

- The task is unrelated to projection patterns
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Building CQRS read models
- Creating materialized views from events
- Optimizing query performance
- Implementing real-time dashboards
- Building search indexes from events
- Aggregating data across streams

## Core Concepts

### 1. Projection Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Event Store │────►│ Projector   │────►│ Read Model  │
│             │     │             │     │ (Database)  │
│ ┌─────────┐ │     │ ┌─────────┐ │     │ ┌─────────┐ │
│ │ Events  │ │     │ │ Handler │ │     │ │ Tables  │ │
│ └─────────┘ │     │ │ Logic   │ │     │ │ Views   │ │
│             │     │ └─────────┘ │     │ │ Cache   │ │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 2. Projection Types

| Type           | Description                 | Use Case               |
| -------------- | --------------------------- | ---------------------- |
| **Live**       | Real-time from subscription | Current state queries  |
| **Catchup**    | Process historical events   | Rebuilding read models |
| **Persistent** | Stores checkpoint           | Resume after restart   |
| **Inline**     | Same transaction as write   | Strong consistency     |

## Templates

### Template 1: Basic Projector

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, Any, Callable, List
import asyncpg

@dataclass
class Event:
    stream_id: str
    event_type: str
    data: dict
    version: int
    global_position: int


class Projection(ABC):
    """Base class for projections."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique projection name for checkpointing."""
        pass

    @abstractmethod
    def handles(self) -> List[str]:
        """List of event types this projection handles."""
        pass

    @abstractmethod
    async def apply(self, event: Event) -> None:
        """Apply event to the read model."""
        pass


class Projector:
    """Runs projections from event store."""

    def __init__(self, event_store, checkpoint_store):
        self.event_store = event_store
        self.checkpoint_store = checkpoint_store
        self.projections: List[Projection] = []

    def register(self, projection: Projection):
        self.projections.append(projection)

    async def run(self, batch_size: int = 100):
        """Run all projections continuously."""
        while True:
            for projection in self.projections:
                await self._run_projection(projection, batch_size)
            await asyncio.sleep(0.1)

    async def _run_projection(self, projection: Projection, batch_size: int):
        checkpoint = await self.checkpoint_store.get(projection.name)
        position = checkpoint or 0

        events = await self.event_store.read_all(position, batch_size)

        for event in events:
            if event.event_type in projection.handles():
                await projection.apply(event)

            await self.checkpoint_store.save(
                projection.name,
                event.global_position
            )

    async def rebuild(self, projection: Projection):
        """Rebuild a projection from scratch."""
        await self.checkpoint_store.delete(projection.name)
        # Optionally clear read model tables
        await self._run_projection(projection, batch_size=1000)
```

### Template 2: Order Summary Projection

```python
class OrderSummaryProjection(Projection):
    """Projects order events to a summary read model."""

    def __init__(self, db_pool: asyncpg.Pool):
        self.pool = db_pool

    @property
    def name(self) -> str:
        return "order_summary"

    def handles(self) -> List[str]:
        return [
            "OrderCreated",
            "OrderItemAdded",
            "OrderItemRemoved",
            "OrderShipped",
            "OrderCompleted",
            "OrderCancelled"
        ]

    async def apply(self, event: Event) -> None:
        handlers = {
            "OrderCreated": self._handle_created,
            "OrderItemAdded": self._handle_item_added,
            "OrderItemRemoved": self._handle_item_removed,
            "OrderShipped": self._handle_shipped,
            "OrderCompleted": self._handle_completed,
            "OrderCancelled": self._handle_cancelled,
        }

        handler = handlers.get(event.event_type)
        if handler:
            await handler(event)

    async def _handle_created(self, event: Event):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO order_summaries
                (order_id, customer_id, status, total_amount, item_count, created_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                event.data['order_id'],
                event.data['customer_id'],
                'pending',
                0,
                0,
                event.data['created_at']
            )

    async def _handle_item_added(self, event: Event):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE order_summaries
                SET total_amount = total_amount + $2,
                    item_count = item_count + 1,
                    updated_at = NOW()
                WHERE order_id = $1
                """,
                event.data['order_id'],
                event.data['price'] * event.data['quantity']
            )

    async def _handle_item_removed(self, event: Event):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE order_summaries
                SET total_amount = total_amount - $2,
                    item_count = item_count - 1,
                    updated_at = NOW()
                WHERE order_id = $1
                """,
                event.data['order_id'],
                event.data['price'] * event.data['quantity']
            )

    async def _handle_shipped(self, event: Event):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE order_summaries
                SET status = 'shipped',
                    shipped_at = $2,
                    updated_at = NOW()
                WHERE order_id = $1
                """,
                event.data['order_id'],
                event.data['shipped_at']
            )

    async def _handle_completed(self, event: Event):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE order_summaries
                SET status = 'completed',
                    completed_at = $2,
                    updated_at = NOW()
                WHERE order_id = $1
                """,
                event.data['order_id'],
                event.data['completed_at']
            )

    async def _handle_cancelled(self, event: Event):
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE order_summaries
                SET status = 'cancelled',
                    cancelled_at = $2,
                    cancellation_reason = $3,
                    updated_at = NOW()
                WHERE order_id = $1
                """,
                event.data['order_id'],
                event.data['cancelled_at'],
                event.data.get('reason')
            )
```

### Template 3: Elasticsearch Search Projection

```python
from elasticsearch import AsyncElasticsearch

class ProductSearchProjection(Projection):
    """Projects product events to Elasticsearch for full-text search."""

    def __init__(self, es_client: AsyncElasticsearch):
        self.es = es_client
        self.index = "products"

    @property
    def name(self) -> str:
        return "product_search"

    def handles(self) -> List[str]:
        return [
            "ProductCreated",
            "ProductUpdated",
            "ProductPriceChanged",
            "ProductDeleted"
        ]

    async def apply(self, event: Event) -> None:
        if event.event_type == "ProductCreated":
            await self.es.index(
                index=self.index,
                id=event.data['product_id'],
                document={
                    'name': event.data['name'],
                    'description': event.data['description'],
                    'category': event.data['category'],
                    'price': event.data['price'],
                    'tags': event.data.get('tags', []),
                    'created_at': event.data['created_at']
                }
            )

        elif event.event_type == "ProductUpdated":
            await self.es.update(
                index=self.index,
                id=event.data['product_id'],
                doc={
                    'name': event.data['name'],
                    'description': event.data['description'],
                    'category': event.data['category'],
                    'tags': event.data.get('tags', []),
                    'updated_at': event.data['updated_at']
                }
            )

        elif event.event_type == "ProductPriceChanged":
            await self.es.update(
                index=self.index,
                id=event.data['product_id'],
                doc={
                    'price': event.data['new_price'],
                    'price_updated_at': event.data['changed_at']
                }
            )

        elif event.event_type == "ProductDeleted":
            await self.es.delete(
                index=self.index,
                id=event.data['product_id']
            )
```

### Template 4: Aggregating Projection

```python
class DailySalesProjection(Projection):
    """Aggregates sales data by day for reporting."""

    def __init__(self, db_pool: asyncpg.Pool):
        self.pool = db_pool

    @property
    def name(self) -> str:
        return "daily_sales"

    def handles(self) -> List[str]:
        return ["OrderCompleted", "OrderRefunded"]

    async def apply(self, event: Event) -> None:
        if event.event_type == "OrderCompleted":
            await self._increment_sales(event)
        elif event.event_type == "OrderRefunded":
            await self._decrement_sales(event)

    async def _increment_sales(self, event: Event):
        date = event.data['completed_at'][:10]  # YYYY-MM-DD
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO daily_sales (date, total_orders, total_revenue, total_items)
                VALUES ($1, 1, $2, $3)
                ON CONFLICT (date) DO UPDATE SET
                    total_orders = daily_sales.total_orders + 1,
                    total_revenue = daily_sales.total_revenue + $2,
                    total_items = daily_sales.total_items + $3,
                    updated_at = NOW()
                """,
                date,
                event.data['total_amount'],
                event.data['item_count']
            )

    async def _decrement_sales(self, event: Event):
        date = event.data['original_completed_at'][:10]
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE daily_sales SET
                    total_orders = total_orders - 1,
                    total_revenue = total_revenue - $2,
                    total_refunds = total_refunds + $2,
                    updated_at = NOW()
                WHERE date = $1
                """,
                date,
                event.data['refund_amount']
            )
```

### Template 5: Multi-Table Projection

```python
class CustomerActivityProjection(Projection):
    """Projects customer activity across multiple tables."""

    def __init__(self, db_pool: asyncpg.Pool):
        self.pool = db_pool

    @property
    def name(self) -> str:
        return "customer_activity"

    def handles(self) -> List[str]:
        return [
            "CustomerCreated",
            "OrderCompleted",
            "ReviewSubmitted",
            "CustomerTierChanged"
        ]

    async def apply(self, event: Event) -> None:
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                if event.event_type == "CustomerCreated":
                    # Insert into customers table
                    await conn.execute(
                        """
                        INSERT INTO customers (customer_id, email, name, tier, created_at)
                        VALUES ($1, $2, $3, 'bronze', $4)
                        """,
                        event.data['customer_id'],
                        event.data['email'],
                        event.data['name'],
                        event.data['created_at']
                    )
                    # Initialize activity summary
                    await conn.execute(
                        """
                        INSERT INTO customer_activity_summary
                        (customer_id, total_orders, total_spent, total_reviews)
                        VALUES ($1, 0, 0, 0)
                        """,
                        event.data['customer_id']
                    )

                elif event.event_type == "OrderCompleted":
                    # Update activity summary
                    await conn.execute(
                        """
                        UPDATE customer_activity_summary SET
                            total_orders = total_orders + 1,
                            total_spent = total_spent + $2,
                            last_order_at = $3
                        WHERE customer_id = $1
                        """,
                        event.data['customer_id'],
                        event.data['total_amount'],
                        event.data['completed_at']
                    )
                    # Insert into order history
                    await conn.execute(
                        """
                        INSERT INTO customer_order_history
                        (customer_id, order_id, amount, completed_at)
                        VALUES ($1, $2, $3, $4)
                        """,
                        event.data['customer_id'],
                        event.data['order_id'],
                        event.data['total_amount'],
                        event.data['completed_at']
                    )

                elif event.event_type == "ReviewSubmitted":
                    await conn.execute(
                        """
                        UPDATE customer_activity_summary SET
                            total_reviews = total_reviews + 1,
                            last_review_at = $2
                        WHERE customer_id = $1
                        """,
                        event.data['customer_id'],
                        event.data['submitted_at']
                    )

                elif event.event_type == "CustomerTierChanged":
                    await conn.execute(
                        """
                        UPDATE customers SET tier = $2, updated_at = NOW()
                        WHERE customer_id = $1
                        """,
                        event.data['customer_id'],
                        event.data['new_tier']
                    )
```

## Best Practices

### Do's

- **Make projections idempotent** - Safe to replay
- **Use transactions** - For multi-table updates
- **Store checkpoints** - Resume after failures
- **Monitor lag** - Alert on projection delays
- **Plan for rebuilds** - Design for reconstruction

### Don'ts

- **Don't couple projections** - Each is independent
- **Don't skip error handling** - Log and alert on failures
- **Don't ignore ordering** - Events must be processed in order
- **Don't over-normalize** - Denormalize for query patterns

## Resources

- [CQRS Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Projection Building Blocks](https://zimarev.com/blog/event-sourcing/projections/)
