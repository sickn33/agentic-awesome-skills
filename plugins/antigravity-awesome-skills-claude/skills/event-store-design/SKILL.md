---
name: event-store-design
description: "Design and implement event stores for event-sourced systems. Use when building event sourcing infrastructure, choosing event store technologies, or implementing event persistence patterns."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Event Store Design

Comprehensive guide to designing event stores for event-sourced applications.

## Do not use this skill when

- The task is unrelated to event store design
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Designing event sourcing infrastructure
- Choosing between event store technologies
- Implementing custom event stores
- Optimizing event storage and retrieval
- Setting up event store schemas
- Planning for event store scaling

## Core Concepts

### 1. Event Store Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Event Store                       │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Stream 1   │  │   Stream 2   │  │   Stream 3   │ │
│  │ (Aggregate)  │  │ (Aggregate)  │  │ (Aggregate)  │ │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤ │
│  │ Event 1     │  │ Event 1     │  │ Event 1     │ │
│  │ Event 2     │  │ Event 2     │  │ Event 2     │ │
│  │ Event 3     │  │ ...         │  │ Event 3     │ │
│  │ ...         │  │             │  │ Event 4     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────┤
│  Global Position: 1 → 2 → 3 → 4 → 5 → 6 → ...     │
└─────────────────────────────────────────────────────┘
```

### 2. Event Store Requirements

| Requirement       | Description                        |
| ----------------- | ---------------------------------- |
| **Append-only**   | Events are immutable, only appends |
| **Ordered**       | Per-stream and global ordering     |
| **Versioned**     | Optimistic concurrency control     |
| **Subscriptions** | Real-time event notifications      |
| **Idempotent**    | Handle duplicate writes safely     |

## Technology Comparison

| Technology       | Best For                  | Limitations                      |
| ---------------- | ------------------------- | -------------------------------- |
| **EventStoreDB** | Pure event sourcing       | Single-purpose                   |
| **PostgreSQL**   | Existing Postgres stack   | Manual implementation            |
| **Kafka**        | High-throughput streaming | Not ideal for per-stream queries |
| **DynamoDB**     | Serverless, AWS-native    | Query limitations                |
| **Marten**       | .NET ecosystems           | .NET specific                    |

## Templates

### Template 1: PostgreSQL Event Store Schema

```sql
-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id VARCHAR(255) NOT NULL,
    stream_type VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    event_data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    version BIGINT NOT NULL,
    global_position BIGSERIAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_stream_version UNIQUE (stream_id, version)
);

-- Index for stream queries
CREATE INDEX idx_events_stream_id ON events(stream_id, version);

-- Index for global subscription
CREATE INDEX idx_events_global_position ON events(global_position);

-- Index for event type queries
CREATE INDEX idx_events_event_type ON events(event_type);

-- Index for time-based queries
CREATE INDEX idx_events_created_at ON events(created_at);

-- Snapshots table
CREATE TABLE snapshots (
    stream_id VARCHAR(255) PRIMARY KEY,
    stream_type VARCHAR(255) NOT NULL,
    snapshot_data JSONB NOT NULL,
    version BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions checkpoint table
CREATE TABLE subscription_checkpoints (
    subscription_id VARCHAR(255) PRIMARY KEY,
    last_position BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Template 2: Python Event Store Implementation

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional, List
from uuid import UUID, uuid4
import json
import asyncpg

@dataclass
class Event:
    stream_id: str
    event_type: str
    data: dict
    metadata: dict = field(default_factory=dict)
    event_id: UUID = field(default_factory=uuid4)
    version: Optional[int] = None
    global_position: Optional[int] = None
    created_at: datetime = field(default_factory=datetime.utcnow)


class EventStore:
    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool

    async def append_events(
        self,
        stream_id: str,
        stream_type: str,
        events: List[Event],
        expected_version: Optional[int] = None
    ) -> List[Event]:
        """Append events to a stream with optimistic concurrency."""
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                # Check expected version
                if expected_version is not None:
                    current = await conn.fetchval(
                        "SELECT MAX(version) FROM events WHERE stream_id = $1",
                        stream_id
                    )
                    current = current or 0
                    if current != expected_version:
                        raise ConcurrencyError(
                            f"Expected version {expected_version}, got {current}"
                        )

                # Get starting version
                start_version = await conn.fetchval(
                    "SELECT COALESCE(MAX(version), 0) + 1 FROM events WHERE stream_id = $1",
                    stream_id
                )

                # Insert events
                saved_events = []
                for i, event in enumerate(events):
                    event.version = start_version + i
                    row = await conn.fetchrow(
                        """
                        INSERT INTO events (id, stream_id, stream_type, event_type,
                                          event_data, metadata, version, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        RETURNING global_position
                        """,
                        event.event_id,
                        stream_id,
                        stream_type,
                        event.event_type,
                        json.dumps(event.data),
                        json.dumps(event.metadata),
                        event.version,
                        event.created_at
                    )
                    event.global_position = row['global_position']
                    saved_events.append(event)

                return saved_events

    async def read_stream(
        self,
        stream_id: str,
        from_version: int = 0,
        limit: int = 1000
    ) -> List[Event]:
        """Read events from a stream."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, stream_id, event_type, event_data, metadata,
                       version, global_position, created_at
                FROM events
                WHERE stream_id = $1 AND version >= $2
                ORDER BY version
                LIMIT $3
                """,
                stream_id, from_version, limit
            )
            return [self._row_to_event(row) for row in rows]

    async def read_all(
        self,
        from_position: int = 0,
        limit: int = 1000
    ) -> List[Event]:
        """Read all events globally."""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT id, stream_id, event_type, event_data, metadata,
                       version, global_position, created_at
                FROM events
                WHERE global_position > $1
                ORDER BY global_position
                LIMIT $2
                """,
                from_position, limit
            )
            return [self._row_to_event(row) for row in rows]

    async def subscribe(
        self,
        subscription_id: str,
        handler,
        from_position: int = 0,
        batch_size: int = 100
    ):
        """Subscribe to all events from a position."""
        # Get checkpoint
        async with self.pool.acquire() as conn:
            checkpoint = await conn.fetchval(
                """
                SELECT last_position FROM subscription_checkpoints
                WHERE subscription_id = $1
                """,
                subscription_id
            )
            position = checkpoint or from_position

        while True:
            events = await self.read_all(position, batch_size)
            if not events:
                await asyncio.sleep(1)  # Poll interval
                continue

            for event in events:
                await handler(event)
                position = event.global_position

            # Save checkpoint
            async with self.pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO subscription_checkpoints (subscription_id, last_position)
                    VALUES ($1, $2)
                    ON CONFLICT (subscription_id)
                    DO UPDATE SET last_position = $2, updated_at = NOW()
                    """,
                    subscription_id, position
                )

    def _row_to_event(self, row) -> Event:
        return Event(
            event_id=row['id'],
            stream_id=row['stream_id'],
            event_type=row['event_type'],
            data=json.loads(row['event_data']),
            metadata=json.loads(row['metadata']),
            version=row['version'],
            global_position=row['global_position'],
            created_at=row['created_at']
        )


class ConcurrencyError(Exception):
    """Raised when optimistic concurrency check fails."""
    pass
```

### Template 3: EventStoreDB Usage

```python
from esdbclient import EventStoreDBClient, NewEvent, StreamState
import json

# Connect
client = EventStoreDBClient(uri="esdb://localhost:2113?tls=false")

# Append events
def append_events(stream_name: str, events: list, expected_revision=None):
    new_events = [
        NewEvent(
            type=event['type'],
            data=json.dumps(event['data']).encode(),
            metadata=json.dumps(event.get('metadata', {})).encode()
        )
        for event in events
    ]

    if expected_revision is None:
        state = StreamState.ANY
    elif expected_revision == -1:
        state = StreamState.NO_STREAM
    else:
        state = expected_revision

    return client.append_to_stream(
        stream_name=stream_name,
        events=new_events,
        current_version=state
    )

# Read stream
def read_stream(stream_name: str, from_revision: int = 0):
    events = client.get_stream(
        stream_name=stream_name,
        stream_position=from_revision
    )
    return [
        {
            'type': event.type,
            'data': json.loads(event.data),
            'metadata': json.loads(event.metadata) if event.metadata else {},
            'stream_position': event.stream_position,
            'commit_position': event.commit_position
        }
        for event in events
    ]

# Subscribe to all
async def subscribe_to_all(handler, from_position: int = 0):
    subscription = client.subscribe_to_all(commit_position=from_position)
    async for event in subscription:
        await handler({
            'type': event.type,
            'data': json.loads(event.data),
            'stream_id': event.stream_name,
            'position': event.commit_position
        })

# Category projection ($ce-Category)
def read_category(category: str):
    """Read all events for a category using system projection."""
    return read_stream(f"$ce-{category}")
```

### Template 4: DynamoDB Event Store

```python
import boto3
from boto3.dynamodb.conditions import Key
from datetime import datetime
import json
import uuid

class DynamoEventStore:
    def __init__(self, table_name: str):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)

    def append_events(self, stream_id: str, events: list, expected_version: int = None):
        """Append events with conditional write for concurrency."""
        with self.table.batch_writer() as batch:
            for i, event in enumerate(events):
                version = (expected_version or 0) + i + 1
                item = {
                    'PK': f"STREAM#{stream_id}",
                    'SK': f"VERSION#{version:020d}",
                    'GSI1PK': 'EVENTS',
                    'GSI1SK': datetime.utcnow().isoformat(),
                    'event_id': str(uuid.uuid4()),
                    'stream_id': stream_id,
                    'event_type': event['type'],
                    'event_data': json.dumps(event['data']),
                    'version': version,
                    'created_at': datetime.utcnow().isoformat()
                }
                batch.put_item(Item=item)
        return events

    def read_stream(self, stream_id: str, from_version: int = 0):
        """Read events from a stream."""
        response = self.table.query(
            KeyConditionExpression=Key('PK').eq(f"STREAM#{stream_id}") &
                                  Key('SK').gte(f"VERSION#{from_version:020d}")
        )
        return [
            {
                'event_type': item['event_type'],
                'data': json.loads(item['event_data']),
                'version': item['version']
            }
            for item in response['Items']
        ]

# Table definition (CloudFormation/Terraform)
"""
DynamoDB Table:
  - PK (Partition Key): String
  - SK (Sort Key): String
  - GSI1PK, GSI1SK for global ordering

Capacity: On-demand or provisioned based on throughput needs
"""
```

## Best Practices

### Do's

- **Use stream IDs that include aggregate type** - `Order-{uuid}`
- **Include correlation/causation IDs** - For tracing
- **Version events from day one** - Plan for schema evolution
- **Implement idempotency** - Use event IDs for deduplication
- **Index appropriately** - For your query patterns

### Don'ts

- **Don't update or delete events** - They're immutable facts
- **Don't store large payloads** - Keep events small
- **Don't skip optimistic concurrency** - Prevents data corruption
- **Don't ignore backpressure** - Handle slow consumers

## Resources

- [EventStoreDB](https://www.eventstore.com/)
- [Marten Events](https://martendb.io/events/)
- [Event Sourcing Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
