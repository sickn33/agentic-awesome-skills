# Visual Asset Guidelines

This skill cannot bundle helper scripts, so these guidelines show how to **perform each visual-asset
ability inline** using public APIs and short, self-contained snippets you run at request time
(scratch cell or terminal).

How to use a guideline:

1. Pick the ability you need below.
2. Run the inline snippet (adjust inputs) in an ephemeral scratch file or terminal — do not save it
   into the skill, since the skill keeps only `references/`.
3. Place the returned local asset path into `layout_tree.objects` with `content.path`, `content.alt`,
   `bbox`, `z_index`, and `classification`.

Shared rules:

- Always return a **local file path** for any placed asset, plus `content.alt`.
- Record provenance (`source`, `license`, `provider`, `model`) for audits.
- On failure, write a failure manifest; never substitute a placeholder and call it generated.
- Never request secrets in chat or a prompt dialog. For cloud auth use `.env` or `az login`.
- Before a billable generation call or any request that sends user-provided or
  source material to a third party, disclose the provider/model, the material
  that will leave the machine, likely cost, and output path. Obtain explicit
  confirmation unless the user already authorized that exact operation.

---

## 1. Icon Search

Use the public Iconify API — no key required.

- Search: `https://api.iconify.design/search?query=<q>&limit=<n>`
- Download SVG: `https://api.iconify.design/<prefix>/<name>.svg?color=%23<hex>`

```python
import json, urllib.parse, urllib.request
from pathlib import Path

def icon_search(query, limit=8, prefix=None, color=None, out_dir="assets/icons"):
    q = urllib.parse.quote(query)
    url = f"https://api.iconify.design/search?query={q}&limit={limit}"
    if prefix:
        url += f"&prefix={urllib.parse.quote(prefix)}"
    data = json.load(urllib.request.urlopen(url, timeout=15))
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    results = []
    for icon_id in data.get("icons", []):
        pfx, name = icon_id.split(":", 1)
        svg_url = f"https://api.iconify.design/{pfx}/{name}.svg"
        if color:
            svg_url += f"?color=%23{color}"
        svg_path = Path(out_dir) / f"{pfx}_{name}.svg"
        svg_path.write_bytes(urllib.request.urlopen(svg_url, timeout=15).read())
        results.append({"id": icon_id, "svg_path": str(svg_path), "license": "per-set (see iconify.design)"})
    return {"query": query, "results": results}
```

- Prefer simple, single-color icons matching the theme accent.
- Use icons as supporting cues, not replacements for required text.

---

## 2. Web Image Search

Prefer the browsing or image-search capability available in the current client.
When you already have a direct image URL (from search results or the user), download it locally:

```python
import urllib.request
from pathlib import Path

def download_image(url, out_path="assets/images/img1.jpg"):
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "pptx-builder/1.0"})
    Path(out_path).write_bytes(urllib.request.urlopen(req, timeout=20).read())
    return {"url": url, "local_path": out_path}
```

- Capture `source` and `license` for attribution; verify usage rights before placing.
- Reference the saved file via `content.path`; do not hotlink remote URLs into the deck.
- Do not use image placeholders as fallback assets; select an approved asset or omit the object.

---

## 3. Vector Asset Decision

Use a true SVG only when it is already a clean vector asset or when the source
contains no essential text or data that needs editing. Do not wrap a raster in
an SVG and treat the result as editable.

- Do not trace a raster merely to satisfy an editability requirement.
- If an illustration contains essential text, recreate the text with native
    PowerPoint objects.
- Keep the original raster or a non-compliant SVG only as a supporting visual or
    hidden reference.

---

## 4. Text → Infographic

Generate through a user-managed provider (OpenAI or Azure OpenAI). Read credentials from environment;
never accept secrets via chat.

Before running the snippet, obtain the external-call confirmation described in
the shared rules. If `output_path` already exists, choose a new path or obtain
separate overwrite confirmation; do not silently replace it.

```python
import base64, json, os
from pathlib import Path
from openai import OpenAI, AzureOpenAI  # provided by the user's environment

def text_to_infographic(prompt, output_path, provider="openai",
                        model_or_deployment="gpt-image-1", size="1024x1024"):
    output = Path(output_path)
    manifest_path = output.with_suffix(".manifest.json")
    existing = [path for path in (output, manifest_path) if path.exists()]
    if existing:
        raise FileExistsError(f"Refusing to overwrite existing paths: {existing}")
    manifest = {"provider": provider, "model_or_deployment": model_or_deployment,
                "output_path": output_path}
    try:
        if provider == "azure-openai":
            client = AzureOpenAI(
                azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
                api_key=os.environ.get("AZURE_OPENAI_API_KEY"),
                api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-02-01"),
            )
        else:
            client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
        result = client.images.generate(model=model_or_deployment, prompt=prompt, size=size)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(base64.b64decode(result.data[0].b64_json))
        manifest["status"] = "ok"
    except Exception as exc:  # report, never fake-generate
        manifest.update(status="error", error=str(exc))
    manifest_path.write_text(json.dumps(manifest, indent=2))
    return manifest
```

- Ask the user for any missing non-secret values: provider, prompt,
  model/deployment, size, and output path.
- Use `.env` or `az login` for auth; never ask for keys/tokens in chat or the dialog.
- Use generated art as a supporting visual. Recreate essential text, labels,
  metrics, and steps with native PowerPoint objects. Add a vector asset only
  when it is a clean, editable source.

---

## 5. NotebookLM Infographic Bridge

NotebookLM has no public generation API, so treat this as an optional, user-configured bridge.

- If the user has a NotebookLM/MCP bridge tool configured, call it with `source_refs` + `prompt`,
  then save the returned image locally and record provenance.
- If no bridge is configured, **fall back to Text → Infographic (section 4)** or omit the asset.
- Apply the same provenance and failure-manifest rules as the other generation guidelines.
