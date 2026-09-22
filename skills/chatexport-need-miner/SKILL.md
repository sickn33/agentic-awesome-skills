---
name: chatexport-need-miner
description: "Mines offline Telegram Desktop chat exports (result.json) for unmet market needs and product opportunities using chunked streaming and verbatim quote grounding. Trigger phrases: mine chat export, telegram result.json, find unmet needs, analyze telegram chat."
category: development
risk: safe
source: community
source_repo: wwewtech/chatexport-need-miner
source_type: community
date_added: "2026-09-22"
author: wwewtech
tags: [telegram, market-research, text-mining, offline-analytics, developer-tools]
tools: [claude, cursor, gemini, windsurf]
license: "MIT"
---

# ChatExport Need Miner: Offline Market Signal & Pain-Point Extractor

Transform offline Telegram Desktop chat exports (`result.json`) into quantified, quote-grounded rankings of unmet market needs with zero memory crashes and absolute source fidelity.

## When to Use This Skill

Activate this skill when:
- The user provides an offline Telegram Desktop chat export (`result.json` or multi-file directory) and requests market research, customer problem analysis, or tool opportunity discovery.
- The user asks: "What are people in this chat struggling with?", "Find product ideas from this export", "What tools do users wish existed?", or "Mine complaints from this group".
- Analyzing multi-megabyte or gigabyte JSON dumps where standard in-memory deserialization (`json.load()`) risks out-of-memory (OOM) fatal crashes.
- Cross-referencing user complaints across multiple independent communities to eliminate echo-chamber noise.

Do NOT use this skill when:
- The user wants live channel scraping, continuous bot monitoring, or MTProto API automation (use dedicated online fetchers).
- Analyzing personal 1-on-1 romantic or private relationships.
- Processing generic SaaS helpdesk feeds (Zendesk, Intercom, Gong) with structured ticket schemas.

## Core Mental Models & Non-Negotiable Rules

1. **The 4MB Stream & Overlap Invariant (Memory Ceiling <= 8MB)**:
   - Telegram Desktop `result.json` files routinely exceed 500MB to 5GB.
   - NEVER load an entire export into memory with `json.load()` or `fs.readFileSync()`.
   - Read the file in fixed 4MB chunks with a 4KB overlap tail.
   - **Boundary Counting Law**: A substring hit is recorded if and only if its terminus falls past the overlap boundary. This guarantees zero missed boundary-spanning phrases and strictly zero duplicate counts.

2. **Cross-Chat Multiplicity Law ($U \ge 3$ Priority)**:
   - One user posting 50 complaints in a single chat is an anecdote; 5 distinct users posting the same complaint across 3 independent chats is a market signal.
   - Cluster rank score is calculated as:
     $$\text{Score} = U \times \sqrt{H}$$
     where $U$ is the number of distinct chat exports containing the signal, and $H$ is the total verified keyword hits.
   - A pattern appearing in $U \ge 3$ chats always outranks a pattern confined to $U = 1$, regardless of raw hit volume.

3. **Verbatim Quote Anchor & Anti-Hallucination Law**:
   - Every identified need theme MUST be backed by 2 to 5 verbatim quotes with exact ISO timestamp (`date`) and chat identifier.
   - NEVER paraphrase a quote inside quotation marks. NEVER synthesize synthetic user statements.
   - If a hypothesized theme lacks verbatim quote support, it MUST be marked `[UNCONFIRMED / NO VERBATIM EVIDENCE]`.

4. **Bi-Lingual Case-Insensitive Seed Lexicons**:
   - Russian Lexicon: `не хватает`, `вот бы`, `бесит`, `надоело`, `задолбал`, `ищу инструмент`, `ищу бот`, `есть ли бот`, `есть ли сервис`, `посоветуйте тул`, `не работает`, `вручную`, `рутина`, `приходится руками`.
   - English Lexicon: `i wish`, `missing`, `annoying`, `frustrating`, `looking for a tool`, `is there an app`, `is there a bot`, `any alternative to`, `doesn't work`, `manually`, `repetitive`, `waste of time`.
   - Custom terms may be added only when explicitly approved or provided by the user.

5. **Strict Air-Gap & Zero Exfiltration**:
   - The entire analysis executes locally and offline. No network requests, no external telemetry, no remote LLM proxying of raw message contents.

## Named Sins & Anti-Patterns (Что категорически ЗАПРЕЩЕНО)

| Anti-Pattern | Manifestation in Code/Workflow | Mandatory Production Counter-Rule |
| :--- | :--- | :--- |
| **The OOM Slurp** | `data = json.load(open('result.json'))` on 800MB file. | Use incremental regex streaming or chunked buffered file reading with `<= 8MB` RAM footprint. |
| **Chunk Boundary Blindness** | Chunking without overlap, truncating `"looking for a tool"` across 4096-byte splits. | Maintain a 4KB sliding overlap tail across chunk transitions. |
| **Double-Count Overlap Trap** | Counting hits found in both chunk $N$ and the overlap window of chunk $N+1$. | Only increment match counter if `match.end() > overlap_size`. |
| **The Echo-Chamber Distortion** | Elevating a bug mentioned 80 times by 1 single user in 1 chat to the #1 product opportunity. | Apply Cross-Chat Multiplicity Law ($U \times \sqrt{H}$) and count unique authors when available. |
| **Hallucinated Quotations** | "User expressed desire for better sync" written in quotes as `"I really need better sync"`. | Exact substring slice from source buffer; if unquoted, label as synthetic analysis. |
| **Service Message Pollution** | Mining system notifications (`"pinned a message"`, `"joined group"`, bot spam) as human needs. | Filter out messages where `type == "service"` or text begins with known bot commands (`/start`). |
| **Premature Uniqueness Claim** | Stating "No tool currently exists for this problem" without validation. | Run explicit coverage audit; if unverified, output strictly: `I cannot confirm this`. |
| **Lossy Encoding Crash** | Crashing on multi-byte emoji surrogate pairs or non-UTF-8 characters in chat history. | Decode with `errors='replace'` or raw byte-level UTF-8 traversal. |
| **Monolithic Theme Lumping** | Grouping all complaints under `"Users want better UI"` or `"Performance issues"`. | Disaggregate into specific actionable workflows (e.g. `"No zero-downtime database migration path"`). |
| **API Creep** | Prompting the user for Telegram Bot tokens or phone numbers for MTProto login. | Reject live requests; reiterate that input contract requires offline `result.json` exports only. |

## Concrete Archetypes / Presets

### Archetype 1: Streaming Regex Need Scanner (Python 3.10+)
```python
import re
import os
from typing import Generator, Dict, List, Tuple

CHUNK_SIZE = 4 * 1024 * 1024  # 4 MB
OVERLAP = 4096                 # 4 KB

RU_LEXICON = re.compile(
    r"(?i)\b(не\s+хватает|вот\s+бы|бесит|надоело|задолбал|ищу\s+(?:инструмент|бот|софт)|"
    r"есть\s+ли\s+(?:бот|сервис|тул)|посоветуйте|вручную|рутина|приходится\s+руками)\b"
)
EN_LEXICON = re.compile(
    r"(?i)\b(i\s+wish|missing|annoying|frustrating|looking\s+for\s+a\s+(?:tool|bot|app)|"
    r"is\s+there\s+(?:an?\s+app|a\s+bot|a\s+tool)|any\s+alternative\s+to|manually|waste\s+of\s+time)\b"
)

def stream_chat_chunks(filepath: str) -> Generator[Tuple[str, int], None, None]:
    overlap_tail = ""
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        while True:
            chunk = f.read(CHUNK_SIZE)
            if not chunk:
                break
            combined = overlap_tail + chunk
            yield combined, len(overlap_tail)
            overlap_tail = combined[-OVERLAP:] if len(combined) >= OVERLAP else combined

def mine_need_signals(filepath: str, regex: re.Pattern, max_samples: int = 5) -> Dict:
    hits = 0
    samples: List[str] = []
    for text_block, overlap_len in stream_chat_chunks(filepath):
        for m in regex.finditer(text_block):
            if m.end() > overlap_len:
                hits += 1
                if len(samples) < max_samples:
                    start = max(0, m.start() - 60)
                    end = min(len(text_block), m.end() + 140)
                    snippet = " ".join(text_block[start:end].split())
                    samples.append(snippet)
    return {"total_hits": hits, "samples": samples}
```

### Archetype 2: Need Cluster & Prioritization Schema
```json
{
  "theme_id": "NEED-001",
  "theme_name": "Zero-Downtime SQLite Replication for Edge Daemons",
  "aggregate_score": 14.14,
  "distinct_chats": 4,
  "total_hits": 50,
  "chats_observed": ["devops_talk_ru", "sqlite_users", "homelab_ops", "backend_craft"],
  "evidence": [
    {
      "date": "2026-08-14T11:22:04",
      "chat": "devops_talk_ru",
      "verbatim_quote": "бесит что нет нормальной репликации для sqlite на edge серверах без поднятия тяжелого postgres"
    },
    {
      "date": "2026-09-02T19:40:12",
      "chat": "sqlite_users",
      "verbatim_quote": "is there a tool that actually handles multi-master sqlite sync without crashing on high concurrency?"
    }
  ],
  "existing_coverage": [
    {"tool": "LiteFS", "gap": "Requires Consul / Fly.io infrastructure; complex on bare-metal edge."},
    {"tool": "rqlite", "gap": "Raft layer alters SQLite interface semantics."}
  ],
  "verdict": "Real commercial gap for turnkey lightweight edge replication."
}
```

### Archetype 3: Multi-File Directory Batch Orchestrator
```python
def process_export_directory(dir_path: str, pattern: re.Pattern) -> List[Dict]:
    results = []
    for root, _, files in os.walk(dir_path):
        for file in files:
            if file == "result.json" or file.endswith(".json"):
                full_path = os.path.join(root, file)
                chat_name = os.path.basename(root) if file == "result.json" else file
                data = mine_need_signals(full_path, pattern)
                if data["total_hits"] > 0:
                    results.append({"chat": chat_name, **data})
    return results
```

## The Pre-Emit Quality Gate Checklist

Before emitting any market research summary or opportunity report, verify:
- [ ] **Memory Protection**: Confirmed that raw JSON was parsed via chunked stream or filtered iterator, never loaded as a monolithic object.
- [ ] **Boundary Integrity**: Overlap boundary logic was applied so split phrases across chunk cuts were not lost or double-counted.
- [ ] **Verbatim Quote Integrity**: Every listed quote exists word-for-word in the input file with exact date and source. Zero paraphrasing.
- [ ] **Cross-Chat Breadth**: Verified how many independent chat files the signal appeared in ($U \ge 3$ emphasized).
- [ ] **Service Message Stripping**: Confirmed system and bot notifications were not tabulated as customer pain points.
- [ ] **Honesty and Verification Clause**: If a gap or existing competitor cannot be verified, explicitly output: `"I cannot confirm this"`.
- [ ] **Actionable Granularity**: Themes are tied to specific engineering or operational workflows, not generic platitudes.

## Self-Correction & Verification Loop

### Bad (Vibe-Coded AI Slop Output):
> "I reviewed the chats and users are looking for better dev tools. Many people complain about speed and say they wish things worked better. There is a huge opportunity to build an AI bot for developers."
*Problems: Zero verbatim quotes, zero date citations, zero chat distribution count, ungrounded speculation, generic meaningless advice.*

### Good (Production ChatExport Need Miner Output):
> ### 1. Schema Migration Rollbacks for Flyway in CI/CD — 38 hits across 4 chats ($U=4, H=38, \text{Score}=24.66$)
> - **Chat Distribution**: `k8s_ru` (14 hits), `devops_community` (12 hits), `backend_pro` (8 hits), `java_chat` (4 hits).
> - **Evidence 1**: *"бесит когда flyway падает на миграции в CI и приходится вручную чистить schema_version таблицу на стейдже"* (2026-07-19T09:12:44, `devops_community`).
> - **Evidence 2**: *"is there a tool to safely dry-run flyway down migrations before merging to master?"* (2026-08-04T16:21:09, `k8s_ru`).
> - **Coverage Check**: Flyway Pro provides undo migrations; however, community tier users lack automated sandbox validation without custom Docker scripts.
> - **Verdict**: Confirmed gap for a lightweight CLI pre-flight validator for open-source Flyway migrations.
