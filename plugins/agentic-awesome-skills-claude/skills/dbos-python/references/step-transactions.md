---
title: Use Transactions for Database Operations
impact: HIGH
impactDescription: Transactions provide atomic database operations
tags: transaction, database, postgres, sqlalchemy
---

## Use Transactions for Database Operations

Transactions are a special type of step optimized for database access. They execute as a single database transaction. Only use with Postgres.

**Incorrect (database access in regular step):**

```python
@DBOS.step()
def save_to_db(data):
    # For Postgres, use transactions instead of steps
    # This doesn't get transaction guarantees
    engine.execute("INSERT INTO table VALUES (?)", data)
```

**Correct (using transaction):**

```python
from sqlalchemy import text

@DBOS.transaction()
def save_to_db(name: str, value: str) -> None:
    sql = text("INSERT INTO my_table (name, value) VALUES (:name, :value)")
    DBOS.sql_session.execute(sql, {"name": name, "value": value})

@DBOS.transaction()
def get_from_db(name: str) -> str | None:
    sql = text("SELECT value FROM my_table WHERE name = :name LIMIT 1")
    row = DBOS.sql_session.execute(sql, {"name": name}).first()
    return row[0] if row else None
```

With SQLAlchemy ORM:

```python
from sqlalchemy import Table, Column, String, MetaData, select

greetings = Table("greetings", MetaData(),
    Column("name", String),
    Column("note", String))

@DBOS.transaction()
def insert_greeting(name: str, note: str) -> None:
    DBOS.sql_session.execute(greetings.insert().values(name=name, note=note))
```

Important:
- Only use transactions with Postgres databases
- For other databases, use regular steps
- Never use `async def` with transactions

Reference: [DBOS Transactions](https://docs.dbos.dev/python/reference/decorators#transactions)
