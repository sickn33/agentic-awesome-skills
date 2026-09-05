---
name: n8n-code-python
description: Write Python code in n8n Code nodes. Use when writing Python in n8n, using _input/_json/_node syntax, working with standard library, or need to understand Python limitations in n8n Code nodes.
risk: critical
source: community
date_added: "2026-09-04"
---

# Python Code Node (Beta)

Expert guidance for writing Python code in n8n Code nodes.

---

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## Critical Limitation: No External Libraries

**MOST IMPORTANT PYTHON LIMITATION**: Cannot import external packages

### What's NOT Available

```python
# ❌ NOT AVAILABLE - Will raise ModuleNotFoundError
import requests  # ❌ No
import pandas  # ❌ No
import numpy  # ❌ No
import scipy  # ❌ No
from bs4 import BeautifulSoup  # ❌ No
import lxml  # ❌ No
```

### What IS Available (Standard Library)

```python
# ✅ AVAILABLE - Standard library only
import json  # ✅ JSON parsing
import datetime  # ✅ Date/time operations
import re  # ✅ Regular expressions
import base64  # ✅ Base64 encoding/decoding
import hashlib  # ✅ Hashing functions
import urllib.parse  # ✅ URL parsing
import math  # ✅ Math functions
import random  # ✅ Random numbers
import statistics  # ✅ Statistical functions
```

### Workarounds

**Need HTTP requests?**
- ✅ Use **HTTP Request node** before Code node
- ✅ Or switch to **JavaScript** and use `$helpers.httpRequest()`

**Need data analysis (pandas/numpy)?**
- ✅ Use Python **statistics** module for basic stats
- ✅ Or switch to **JavaScript** for most operations
- ✅ Manual calculations with lists and dictionaries

**Need web scraping (BeautifulSoup)?**
- ✅ Use **HTTP Request node** + **HTML Extract node**
- ✅ Or switch to **JavaScript** with regex/string methods

**See**: STANDARD_LIBRARY.md for complete reference

---

## When to Use Python vs JavaScript

### Use Python When:
- ✅ You need `statistics` module for statistical operations
- ✅ You're significantly more comfortable with Python syntax
- ✅ Your logic maps well to list comprehensions
- ✅ You need specific standard library functions

### Use JavaScript When:
- ✅ You need HTTP requests ($helpers.httpRequest())
- ✅ You need advanced date/time (DateTime/Luxon)
- ✅ You want better n8n integration
- ✅ **For 95% of use cases** (recommended)

### Consider Other Nodes When:
- ❌ Simple field mapping → Use **Set** node
- ❌ Basic filtering → Use **Filter** node
- ❌ Simple conditionals → Use **IF** or **Switch** node
- ❌ HTTP requests only → Use **HTTP Request** node

---

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
