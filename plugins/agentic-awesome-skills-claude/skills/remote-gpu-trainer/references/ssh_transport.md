# SSH Transport — keys, keepalive, resumable copy, secrets-via-stdin

Platform-agnostic SSH + file-transfer substrate for every `ssh-rental` profile (AutoDL, RunPod,
vast.ai, Lambda, Paperspace, China, bare SSH). One-time config so subsequent commands are short and
password-less, plus the copy/secret patterns that survive flaky networks and short rentals. Concrete
hosts, ports, and credential locations are **profile facts** — this file owns the *mechanism*, the
profile (`profiles/<platform>.md` §1/§3/§8) owns the *values*.

To jump: `grep -in '<keyword>' references/ssh_transport.md` (e.g. `keepalive`, `rsync`, `stdin`, `crlf`).

## Table of contents

1. Key generation
2. Push the public key to an instance
3. `~/.ssh/config` alias + keepalive tuning
4. Verify the alias
5. Resumable copy — rsync vs scp, and WHY rsync
6. Bulk per-dir download loop
7. Move secrets via stdin — never inline a key, never on a durable FS
8. CRLF — `.sh` authored on Windows breaks on Linux
9. Two SSH flavors — proxied/basic SSH cannot `scp`
10. Transport gotchas (Symptom → Root cause → Fix)

---

## 1. Key generation

Skip if `~/.ssh/id_ed25519` already exists.

```bash
ssh-keygen -t ed25519 -C "<label>"
# Save path: Enter for the default ~/.ssh/id_ed25519
# Passphrase: optional (Enter for none, or set one + use ssh-agent)
```

`ed25519` is shorter and more secure than RSA; every rental platform accepts both. One local key is
reused across all instances — generate once, push the **public** half (§2) to each box. The private
half (`~/.ssh/id_ed25519`, no `.pub`) never leaves the local machine and **never** goes onto a rental,
a shared FS, or a cloud agent (a cloud scheduler runs in an isolated sandbox with no access to it — and
putting a private key there is a secret leak; see `references/monitoring_patterns.md`).

## 2. Push the public key to an instance

Copy the connection string from the platform's web console / API; it has the shape
`ssh -p <PORT> root@connect.<region>.<provider>.com`. Push the public key once:

```bash
ssh-copy-id -p <PORT> root@connect.<region>.<provider>.com
# enter the platform-provided password ONCE
```

If `ssh-copy-id` is absent (common on Windows-native shells), append the key manually:

```bash
cat ~/.ssh/id_ed25519.pub          # copy the entire line
ssh -p <PORT> root@connect.<region>.<provider>.com
# on the remote:
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "<paste the public key line>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

Test: re-running the `ssh …` line should connect **without** a password prompt.

## 3. `~/.ssh/config` alias + keepalive tuning

One block per instance turns `ssh -p <PORT> root@connect.<region>.<provider>.com` into `ssh <alias>`,
and folds in the keepalive options that keep long monitoring/transfer connections from dropping.

```ssh-config
Host proj-1
    HostName connect.<region>.<provider>.com
    Port <PORT>
    User root
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 120
    TCPKeepAlive yes
    # LogLevel VERBOSE   # uncomment to debug a refused/hung connection

Host proj-2
    HostName connect.<region>.<provider>.com
    Port <PORT>
    User root
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 60
    ServerAliveCountMax 120
```

**Naming**: `<project>-<index>` (e.g. `proj-1`, `proj-2`) reads cleanly in a fan-out loop; avoid bare
`gpu1`. **Why the three keepalive options**:

- `ServerAliveInterval 60` — send an application-layer heartbeat every 60 s, so a NAT/idle timeout on
  the path does not silently drop a parked connection (mid-`scp`, or an open monitor).
- `ServerAliveCountMax 120` — tolerate up to 120 missed heartbeats before declaring the link dead (≈2 h
  of network instability survived). Lower it (e.g. 3) for a *bounded* monitor that should self-kill on a
  blip rather than hang — see the short-connection poll in `references/monitoring_patterns.md`.
- `TCPKeepAlive yes` — let the OS also emit TCP-layer keepalives, catching a peer that vanishes
  ungracefully.

Ports change when a profile re-issues an instance (`ssh-rental` boxes assign a new port on
re-creation) — update the `Port` line after each create/recreate, then re-run §4.

## 4. Verify the alias

```bash
for a in proj-1 proj-2 proj-3 proj-4; do
    echo "=== $a ==="
    ssh -o ConnectTimeout=10 "$a" "hostname; date"
done
```

Each should print a distinct hostname. Then the env probe (SKILL.md Phase 1):
`ssh <alias> 'python -c "import torch;print(torch.cuda.is_available())"'`.

## 5. Resumable copy — rsync vs scp, and WHY rsync

`scp` opens **one** SSH stream for the whole transfer and **cannot resume**: any blip mid-copy aborts
the entire run and a re-run starts from zero. `rsync` compares source/dest and ships only the delta, so
a re-run after a drop **continues** instead of restarting — the single most important property on a
metered box where a 130 GB pull can blip at minute 45.

**Prefer `rsync` for anything large or multi-file:**

```bash
rsync -avz --partial --inplace --progress \
    -e ssh \
    <alias>:/root/autodl-tmp/checkpoints/ /path/to/local/checkpoints/
```

- `-a` archive (recurse + preserve perms/times/symlinks), `-v` verbose, `-z` compress on the wire.
- `--partial` keeps a partially-transferred file on interruption so the next run resumes mid-file
  (without it, rsync deletes the partial and re-sends from the start).
- `--inplace` writes directly into the destination file (resume-friendly; avoids a full temp copy on a
  tight local disk). Drop it if atomic-replace of an existing dest matters more than resumability.
- Re-run the **identical** command after any failure — that *is* the resume (principle #7).

Use plain `scp` only for a **single small** file (a config, one checkpoint < ~1 GB) where resume is
moot. For a large *tree*, even `scp` users should fall back to the **per-dir loop** (§6) so one dir's
failure doesn't lose the rest. If `rsync` is missing on the remote image, `apt-get install rsync` (when
online) or use the §6 loop.

> The bulk-download stall-retry ladder (HF/ModelScope mirror swaps, `timeout … && break` loops) is a
> *download-from-the-internet* concern, not host↔host copy — that lives in `references/china-network.md`.

## 6. Bulk per-dir download loop

For a large directory tree (many run/checkpoint dirs), wrap each dir in its **own** SSH session so a
single drop loses only that dir, and a re-run **skips already-complete dirs**:

→ `scripts/download_loop.sh` (parameterize `LOCAL_TARGET`, `REMOTE_ALIAS`, `REMOTE_PATH`).

Its shape, and why each piece matters:

- **List once, copy per-dir** — each `scp -r <alias>:<remote>/$d ./` is an independent session; one
  failure ≠ whole-transfer loss (the `scp` single-stream trap, §5).
- **Size-threshold skip** — a dir already ≥ threshold counts as complete and is skipped; a partial dir
  is removed and re-pulled. Re-running the whole script is therefore idempotent and resumable.
- **Per-dir `ConnectTimeout` + the §3 keepalive flags** on every `scp` so a hung session self-kills
  instead of blocking the loop.

## 7. Move secrets via stdin — never inline a key, never on a durable FS

Putting a credential **in a command** (`ssh host "echo 'KEY' > …"`, or `scp key.txt host:…`) leaks the
value into shell history, agent transcripts, and hook logs. Putting it on a **shared /
durable FS** is worse: the value persists for every co-tenant, and some platforms' upload classifiers
*block or corrupt* a file matching a known key pattern — so a credential written to the cross-instance
FS may silently never arrive. **Push credentials to each box's per-instance system disk, via stdin**, so
the value flows file → pipe → file and appears in no command text or output:

```bash
# stream exactly one credential block — value never appears on a command line
grep -A 2 "machine api.<provider>.com" ~/.netrc \
  | ssh <alias> 'umask 077; cat > /root/.netrc && chmod 600 /root/.netrc'
```

```bash
# or a single token, same principle (stdin in, file out, chmod 600)
printf '%s\n' "$TOKEN_FROM_ENV" \
  | ssh <alias> 'umask 077; cat > /root/.<service>_key && chmod 600 /root/.<service>_key'
```

Rules that make this safe:

- **One block, not the whole file.** Stream a single `machine …` stanza, never the entire `~/.netrc` —
  it carries unrelated machines' credentials, and security hooks (rightly) block copying the whole file.
- **Reference, never echo.** Source the token from an env var (`$TOKEN_FROM_ENV`) or a keyring; never
  paste the literal value into the command.
- **Per-instance system disk, not the shared FS.** Write to `/root/.<service>_key` (volatile but
  private), not the cross-instance durable mount. The wrapper reads it and exports the env var before
  launch (e.g. `export WANDB_API_KEY=$(cat /root/.wandb_key)`).
- **Verify by capability, not by echoing the value:**
  `ssh <alias> 'python -c "import wandb; print(wandb.Api(timeout=20).default_entity)"'`.

## 8. CRLF — `.sh` authored on Windows breaks on Linux

Symptom → Root cause → Fix:

- **Symptom**: a synced launcher does nothing (empty log); run by hand it errors `set: -: invalid
  option`, `cd: /path\r: No such file or directory`, or `syntax error near unexpected token $'do\r'` —
  every line "ends in `\r`".
- **Root cause**: Windows `core.autocrlf=true` (or `git archive` exporting with the working-tree EOL)
  writes `.sh` with CRLF; Linux `bash` treats the trailing `\r` as part of each token. (`.py` is
  unaffected — Python's universal newlines tolerate CRLF; specifically `bash`/`.sh` breaks.)
- **Fix**: add `.gitattributes` with `*.sh text eol=lf` so `git archive`/checkout always emits LF; as an
  immediate on-box unblock, `sed -i 's/\r$//' scripts/*.sh`.

Every shell script in `scripts/` ships LF and starts `#!/usr/bin/env bash` + `set -u`; keep that
contract when authoring new ones. **Never** put an unquoted `|` inside a `grep` regex in a transport or
poll script — the shell splits it into piped commands and the first reads stdin → hangs forever
(`references/monitoring_patterns.md`).

## 9. Two SSH flavors — proxied/basic SSH cannot `scp`

Some `ssh-rental` platforms expose **two** SSH endpoints, and the difference dictates whether file
transfer works at all:

- **Direct TCP SSH** — a real TCP port to the container (the `connect.<region>.<provider>.com:<PORT>`
  shape above). Full `scp`/`rsync`/`sftp` work. This is what every transfer in this file assumes.
- **Proxied / "basic" SSH** — a relayed or web-terminal SSH (common on RunPod and vast.ai for the
  default exposed endpoint). It carries an **interactive shell only**: `scp`/`rsync`/`sftp` fail (often
  with `subsystem request failed` / a hung handshake) because the proxy doesn't forward the SFTP
  subsystem.

**Fix**: for any code/data/checkpoint transfer, use the **direct-TCP** endpoint — on RunPod expose a
TCP port (the `ssh root@<ip> -p <PORT>` form, not the proxied `ssh <pod>@ssh.runpod.io` one); on vast.ai
use the instance's direct SSH port. Each profile's §3 NETWORK names which endpoint is which and whether
ports change on restart. If only proxied SSH is available, transfer out-of-band instead (push results to
object storage / HF Hub from on-box and pull from there).

## 10. Transport gotchas (Symptom → Root cause → Fix)

Universal gotchas (disk-full, inode, OOM, silent sync) are **not** repeated here — see
`references/gotchas_universal.md`. These are transport-specific.

**T1 — SSH exits 255 / "Connection reset" right after a `pkill`/`kill`.**
Symptom: `ssh <alias> 'pkill -9 -f src.train'` returns `Connection reset by peer`, exit 255. → Root
cause: killing the process tree disrupts the PTY chain; the SSH client receives EOF and exits — and
anything *after* the kill in that same one-liner never runs. → Fix: this is **normal**, not a failure.
Re-ssh to verify (`ssh <alias> "pgrep -af src.train | head -1 || echo CLEAN"`). Split kill and relaunch
into **two** ssh calls — never `pkill X; relaunch X` in one command, the relaunch is dropped with the
session.

**T2 — large `scp -r` drops with "Read from remote host … reset by peer" 30–60 min in.**
Symptom: a 130 GB `scp -r` aborts mid-transfer; the local tree has only the first few dirs, the rest
gone. → Root cause: one SSH stream for the whole transfer; any blip kills it and `scp` does not resume.
→ Fix: use `rsync --partial` (§5) or the per-dir loop (§6) — each dir an independent session, re-run
skips completed dirs.

**T3 — `.sh` "ends in `\r`" after a Windows→Linux sync.**
See §8 (`.gitattributes` `*.sh text eol=lf`; on-box `sed -i 's/\r$//'`).

**T4 — a credential leaks into history / a shared FS, or its FS upload silently fails.**
Symptom: a key pasted into an `ssh`/`scp` command lands in transcripts and hook logs; an scp of the key
to the shared FS "succeeds" but the file is missing or corrupt. → Root cause: the value appeared in a
command line; and some platforms' FS classifiers block/corrupt credential-shaped uploads. → Fix: §7 —
stream one block via stdin to the per-instance disk, verify by capability not by echo.

**T5 — `scp dest open "/root/x/": Failure` instantly.**
Symptom: a (often parallel/background) `scp big.tar <alias>:/root/x/` fails at once because the
destination dir doesn't exist — a sibling command meant to `mkdir` it ran later, or was blocked. → Root
cause: the transfer assumed a directory a *different* command was supposed to create (a parallel-setup
race). → Fix: make every transfer self-sufficient — create the dest in the same command:
`ssh <alias> 'mkdir -p /root/x' && scp … || retry`. Never assume a sibling created the destination.

**T6 — `Host key verification failed` after an instance is recreated.**
Symptom: same `connect.<region>.<provider>.com` host, new host key, so SSH refuses. → Root cause: the
recreated container presents a different host key on the reused hostname/port. → Fix:
`ssh-keygen -R '[connect.<region>.<provider>.com]:<PORT>'`, then reconnect (re-accepts the new key).
