# Frozen legacy installer baseline: 14.6.0

This directory freezes the public legacy behavior of the registry-published
`agentic-awesome-skills@14.6.0` installer. It never uses the repository checkout
as the executable baseline.

## Acquisition and replay

1. `node acquire-baseline.mjs` queries the exact registry version, requires its
   metadata to match the independently frozen SRI, downloads into staging,
   verifies the bytes, and only then promotes the tarball. It installs with
   lifecycle scripts disabled into an isolated `_work/` runtime.
2. `node generate-snapshots.mjs` performs no network access. Its `PATH` shadows
   `git` with the deterministic local fake, and every case receives isolated
   `HOME`, `USERPROFILE`, temp, cwd, targets and trace paths.
3. `node validate-snapshots.mjs` re-verifies the tarball SRI, fixture tree,
   all 41 snapshot hashes, every case tree digest and per-case/aggregate fake-Git
   trace digest.
4. After initial acquisition, `node acquire-baseline.mjs --offline` verifies and
   reuses the acquired bytes and runtime without a registry request.

The `_work/` directory is ignored. The verified registry tarball and its minimal
registry identity record are retained under `artifacts/` as frozen evidence.

The independent metadata query used to confirm the registry identity was:

```text
npm view agentic-awesome-skills@14.6.0 dist.integrity dist.shasum dist.tarball --json
```

It returned SRI
`sha512-VTOb3O9PSYKCDO99i3h0vOn7vHQlGtO/+jSErR80g6OGaDJoBzg3q2GE9Nu890en1/Z54hBEYiVQj/1Rl95xEg==`,
SHA-1 `3a58a1346cbc7d0b39500cf6f9ee687184533036`, and the tarball URL frozen in
`artifacts/registry-metadata.json`. The acquired tarball additionally has
SHA-256 `98f8cbb399613621598ac6aeca619fc7c454530895b4e237eee695d82fbdf0cb`.

## Normalization contract

- stdout/stderr CRLF is converted to LF;
- only known harness roots are replaced, longest first, with `<CASE_ROOT>`,
  `<BASELINE_RUNTIME>` and `<CORPUS_ROOT>`;
- fake Git records the clone destination as `<CLONE_DIR>` before persistence;
- only `updatedAt` in `.antigravity-install-manifest.json` is replaced with
  `<TIMESTAMP>` before filesystem hashing;
- harness trace files are excluded from the controlled filesystem report but
  are hashed separately;
- file paths, types, normalized byte sizes, SHA-256 values and hardlink counts
  remain visible;
- file permission modes are intentionally omitted from the portable golden
  because NTFS and POSIX expose different mode semantics; executable-bin mode
  verification belongs to the separate tarball/package gate;
- no generic line, digit, date, error, or output exclusion is permitted.

The fixture contains only synthetic, non-sensitive content. No user config is
read or written and no real agent target is reachable from a case environment.
