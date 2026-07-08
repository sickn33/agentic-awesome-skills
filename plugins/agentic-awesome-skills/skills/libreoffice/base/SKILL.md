---
name: base
description: "Database management, forms, reports, and data operations with LibreOffice Base."
category: database-processing
risk: safe
source: personal
date_added: "2026-02-27"
---

# LibreOffice Base

## Overview

LibreOffice Base skill for creating, managing, and automating database workflows using the native ODB (OpenDocument Database) format.

## When to Use This Skill

Use this skill when:
- Creating new databases in ODB format
- Connecting to external databases (MySQL, PostgreSQL, etc.)
- Automating database operations and reports
- Creating forms and reports
- Building database applications

## Core Capabilities

### 1. Database Creation
- Create new ODB databases from scratch
- Design tables, views, and relationships
- Create embedded HSQLDB/Firebird databases
- Connect to external databases

### 2. Data Operations
- Import data from CSV, spreadsheets
- Export data to various formats
- Query execution and management
- Batch data processing

### 3. Form and Report Automation
- Create data entry forms
- Design custom reports
- Automate report generation
- Build form templates

### 4. Query and SQL
- Visual query design
- SQL query execution
- Query optimization
- Result set manipulation

### 5. Integration
- Command-line automation
- Python scripting with UNO
- JDBC/ODBC connectivity

## Workflows

### Creating a New Database

#### Method 1: Command-Line
```bash
soffice --base
```

#### Method 2: Python with UNO
```python
import uno

def create_database():
    local_ctx = uno.getComponentContext()
    resolver = local_ctx.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_ctx
    )
    ctx = resolver.resolve(
        "uno:socket,host=localhost,port=8100;urp;StarOffice.ComponentContext"
    )
    smgr = ctx.ServiceManager
    doc = smgr.createInstanceWithContext("com.sun.star.sdb.DatabaseDocument", ctx)
    doc.storeToURL("file:///path/to/database.odb", ())
    doc.close(True)
```

### Connecting to External Database

```python
import uno

def connect_to_mysql(host, port, database, user, password):
    local_ctx = uno.getComponentContext()
    resolver = local_ctx.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_ctx
    )
    ctx = resolver.resolve(
        "uno:socket,host=localhost,port=8100;urp;StarOffice.ComponentContext"
    )
    smgr = ctx.ServiceManager
    
    doc = smgr.createInstanceWithContext("com.sun.star.sdb.DatabaseDocument", ctx)
    datasource = doc.getDataSource()
    datasource.URL = f"sdbc:mysql:jdbc:mysql://{host}:{port}/{database}"
    datasource.Properties["UserName"] = user
    datasource.Properties["Password"] = password
    
    doc.storeToURL("file:///path/to/connected.odb", ())
    return doc
```

## Database Connection Reference

### Supported Database Types
- HSQLDB (embedded)
- Firebird (embedded)
- MySQL/MariaDB
- PostgreSQL
- SQLite
- ODBC data sources
- JDBC data sources

### Connection Strings

```
# MySQL
sdbc:mysql:jdbc:mysql://localhost:3306/database

# PostgreSQL
sdbc:postgresql://localhost:5432/database

# SQLite
sdbc:sqlite:file:///path/to/database.db

# ODBC
sdbc:odbc:DSN_NAME
```

## Command-Line Reference

```bash
soffice --headless
soffice --base  # Base
```

## Python Libraries

```bash
pip install pyodbc    # ODBC connectivity
pip install sqlalchemy # SQL toolkit
```

## Best Practices

1. Use parameterized queries
2. Create indexes for performance
3. Backup databases regularly
4. Use transactions for data integrity
5. Store ODB source files in version control
6. Document database schema
7. Use appropriate data types
8. Handle connection errors gracefully

## Troubleshooting

### Cannot open socket
```bash
killall soffice.bin
soffice --headless --accept="socket,host=localhost,port=8100;urp;"
```

### Connection Issues
- Verify database server is running
- Check connection string format
- Ensure JDBC/ODBC drivers are installed
- Verify network connectivity

## Resources

- [LibreOffice Base Guide](https://documentation.libreoffice.org/)
- [UNO API Reference](https://api.libreoffice.org/)
- [HSQLDB Documentation](http://hsqldb.org/)
- [Firebird Documentation](https://firebirdsql.org/)

## Related Skills

- writer
- calc
- impress
- draw
- workflow-automation

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
