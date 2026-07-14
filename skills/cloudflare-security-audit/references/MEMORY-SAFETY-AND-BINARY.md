# Memory Safety, Binary, and Kernel Hunting

#### When to use this file

The attack classes in `ATTACK-CLASSES.md` are tuned for web apps, APIs, and services. Reach for *this* file when the target processes untrusted bytes in a memory-unsafe context: C/C++/Objective-C, Rust `unsafe`, kernel modules and drivers, parsers and decoders (image/video/font/archive/PDB), reverse-engineering and dev tooling, network daemons, firmware, and language runtimes/JITs. These targets fail differently from web apps — the bug is a memory corruption or a logic error in privileged code, not an injection or an access-control gap — so the hunt needs a different lens.

Pick the relevant classes based on Phase 1. Split per subsystem for large targets.

## Core discipline (include in every agent prompt for this domain)

```
- A buffer sized for the common case can still overflow on adversarial input. Verify every "this length is bounded" claim against the WORST case, not the happy path.
- "Huge count = guaranteed crash" is FALSE. An oversized copy length is size- and libc-dependent: it often faults, but the copy primitive can also wrap or land a short, scattered write first. Determine the actual write behavior before downgrading to DoS-only.
- Static offsets are a guess; the crash dump is truth. An unreproduced bug is not a bug — if you claim exploitability, say exactly which input reaches which sink and what the observable result is.
- Sanitizer silence ≠ safety where the deref is outside instrumented code (hand-written asm, JIT-emitted, intra-allocation). Don't trust a clean ASan run for those.
```

## Memory-safety attack classes (subagent_type: `general`)

**Spatial: out-of-bounds read/write**
- **Length subtraction underflow** — a copy/loop bound is `a - b` (`uri.len - prefix`, `total - consumed`) where the attacker can make `b > a`. Negative → casts to ~SIZE_MAX. Map which bytes land where; don't assume "just a crash."
- **Operator-precedence / multi-term length errors** — an unparenthesized `+`/`-` length chain (`endp - begin + consume`) that silently over-adds when one term is attacker-sized. Audit each CALLER's value of the variable term — the common caller is often correct-by-accident on the zero path and survives testing.
- **`sizeof(*p)` vs `sizeof(element)` pointer-depth confusion** — an allocation/copy size computed one indirection too deep (`gid_t **` → `sizeof(*p)`=8 not 4). The bounds check passes because it uses the same wrong unit. Compiled tell: `shl $0x3` where `shl $0x2` was meant.
- **Wire-length into fixed stack buffer** — a function rebuilds a network/user blob into a fixed array using an attacker length field, with the bounds check missing/late or computed on the wrong headroom (a header pre-written into the buffer). Re-derive true headroom (size minus fixed prefix); confirm no guard precedes the copy.

**Temporal: use-after-free / lifetime**
- **Embedded waiter-anchor freed without draining** — a struct embeds a list head (`selinfo`/`knlist`/timer/knote) reachable by unprivileged poll/select/kqueue, and a free path destroys it but skips the drain a wakeup path does. For every `selrecord(&obj->x)`, require a matching drain on EACH path that can free `obj`.
- **Cached raw pointer + reallocating owner** — a view caches `base+offset`, a grow/realloc path moves the backing store, and the invalidation walks only the *current* wrapper's view set while grow *replaces* the wrapper. The original view dangles.

**Type confusion**
- **Read-and-write confusion → addrof/fakeobj** — a confusion that reads a pointer slot as a scalar (addrof) and writes a scalar into a pointer slot (fakeobj). The standard pivot of runtime/JIT exploitation; the prior art is about the PROBLEM CLASS (NaN-boxing, cached typed-array data pointer), not the specific target.
- **Hierarchical-walker leaf check skipped** — a page-table / nested / B-tree / extent walker checks the valid bit but not the leaf/size bit at level N, then descends treating an attacker-owned leaf as an interior node.

**Value: uninitialized & oracle**
- **Uninitialized worst-case buffer + observable compare = read oracle** — a buffer sized to a MAX constant is partially written, then compared against attacker bytes with an attacker-controlled compare length where match/no-match is observable. No memory-disclosure bug needed; the gap between actual output and MAX-size is the leak window. Brute one byte/connection, hint the structural bits, parallelize.

## Kernel & privileged-interface attack classes (subagent_type: `general`)

- **User-copy bounds + double-fetch (TOCTOU)** — a syscall/ioctl/Mach-trap entry whose user-copy primitive (`copyin` / `copy_from_user`) brings attacker memory in, then re-reads the SAME user address after a check. Any fact derived from concurrently-mutable user memory and trusted on a later pass is a double-fetch even when each op is individually correct.
- **Object lifecycle / UAF (IOKit/OSObject and friends)** — unbalanced retain/release on an externally-reachable object; a method that releases on one path but a sibling dispatch (compat/fallback/ptrace) forgot it. Diff the duplicated dispatch paths.
- **Unchecked downcast / type confusion** — `OSDynamicCast` (or any tagged-union cast) whose result is used without a null check, or a selector/index into a dispatch table without a bounds check.
- **World-writable / under-permissioned powerful interface** — a device node, admin socket, or mgmt API exposed more broadly than its power, that validates the request SHAPE (index in range) but never the requester's AUTHORITY over the named resource. Danger = power × reachability; enumerate the surface reachable from the *actual* untrusted context first.
- **Validate-then-act-on-stale-state** — a fast path and a compat/ptrace/fallback path to the same operation where one copy forgot a guard the other performs.

## Universal moves (apply across the above)

- **Audit the incomplete fix.** A targeted patch is a high-signal pointer to a dangerous sink with the analysis already done. Read the diff → find the exact sink it hardened → scan the same function, parallel paths, and alternate callers for the SAME tainted-data-to-sink shape the patch missed. Incomplete fixes are their own bug class.
- **Trust asymmetry between two ends of a protocol.** A filter/verification/size-cap installed on one side of a connection but missing on the symmetric call on the other. Find the protective call → grep its mirror on the opposite role → if absent, the earliest unprotected pre-auth parse is the prize. A malicious server/MITM is a real attacker.
- **Chain a weak primitive.** A blocked path means you haven't found the right pivot, not that it's unexploitable. Always ask "what does this actually let me do, and what runs automatically once I can put bytes on disk?" (plugin dirs, autoload, `.git/hooks`, `conftest.py`).
- **Hunt where the crowd isn't.** The tools researchers themselves trust — debuggers, disassemblers, scanners, dev tooling — are under-audited and high-impact. Old code and obscure formats are gold.

## Validation rules (apply before reporting ANY finding here)

1. **Build a debuggable target first.** Wire in crash dumps + a debugger before you claim exploitability. You can't iterate on what you can't observe.
2. **Read the offset from the crash, not the disassembly.** Send a cyclic (De Bruijn) pattern; the faulting register values give the exact offset. A variable-length prefix (handle, optional field, padding) shifts the geometry off the static prediction.
3. **Prove a UAF by reclaim-and-compare** when the sanitizer is blind (asm/JIT/intra-allocation): trigger the dangling view, reclaim the freed region with a size-matched content-controlled allocation, write through the dangler, read the reclaimer back — aliasing either way proves it.
4. **Distinguish crash from exploitable.** For an OOB write, map which bytes land where and whether a security-relevant field is reachable; for a "huge count," prove the bounded-write case before calling it DoS-only.
5. **Return ONLY confirmed findings** with the exact input → sink path and the observable result, or "No exploitable memory-safety issues found" if that's honest.
