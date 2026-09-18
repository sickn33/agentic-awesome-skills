# LWC Document Conversion

## Use when

Use Markdown conversion when a task needs local PDF, Office, EPUB, or another
non-text input converted into reviewable Markdown before optional ingestion.

## Skip when

Skip conversion for existing Markdown/plain text or when the source can be read
safely without a derived file. Conversion is not ingestion and is never required
for ordinary recall.

## Minimum workflow

### Markdown conversion recommendation

Run `lwc --scope project config show`. Conversion is optional and disabled by
default. Explain local I/O and adapter security, then ask the user to install and
choose exactly one adapter:

```bash
# Firecrawl anydoc
npm install --global @firecrawl/anydoc
lwc --scope project config set --trans anydoc

# Microsoft MarkItDown
python3 -m pip install 'markitdown[all]'
lwc --scope project config set --trans markitdown
```

Run only the selected configuration command, then:

```bash
lwc --scope project trans INPUT --output OUTPUT.md
```

Write to a new output, review the Markdown, and only then perform a separate
explicit `source add OUTPUT.md` if the derived document belongs in memory. Put
adapter credentials in its environment, never `--trans-arg`.

## Consent boundaries

Never install, enable, or fall back between adapters silently. External input
requires the existing source-path authorization, and sensitive content requires
review. A conversion receipt does not authorize or prove ingest.

## Completion evidence

- Config reports one selected adapter and bounded timeout/arguments.
- Output is a new in-scope Markdown file and was reviewed for completeness.
- No credential appears in CLI args, config, logs, or output.
- Ingest, if requested, has its own source receipt and citation lifecycle.
