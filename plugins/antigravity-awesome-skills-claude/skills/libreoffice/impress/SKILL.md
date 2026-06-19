---
name: impress
description: "Presentation creation, format conversion (ODP/PPTX/PDF), slide automation with LibreOffice Impress."
category: presentation-processing
risk: safe
source: personal
date_added: "2026-02-27"
---

# LibreOffice Impress

## Overview

LibreOffice Impress skill for creating, editing, converting, and automating presentation workflows using the native ODP (OpenDocument Presentation) format.

## When to Use This Skill

Use this skill when:
- Creating new presentations in ODP format
- Converting between ODP, PPTX, PDF formats
- Automating slide generation from templates
- Batch processing presentation operations
- Creating presentation templates

## Core Capabilities

### 1. Presentation Creation
- Create new ODP presentations from scratch
- Generate presentations from templates
- Create slide masters and layouts
- Build interactive presentations

### 2. Format Conversion
- ODP to other formats: PPTX, PDF, HTML, SWF
- Other formats to ODP: PPTX, PPT, PDF
- Batch conversion of multiple files

### 3. Slide Automation
- Template-based slide generation
- Batch slide creation from data
- Automated content insertion
- Dynamic chart generation

### 4. Content Manipulation
- Text and image insertion
- Shape and diagram creation
- Animation and transition control
- Speaker notes management

### 5. Integration
- Command-line automation via soffice
- Python scripting with UNO
- Integration with workflow tools

## Workflows

### Creating a New Presentation

#### Method 1: Command-Line
```bash
soffice --impress template.odp
```

#### Method 2: Python with UNO
```python
import uno

def create_presentation():
    local_ctx = uno.getComponentContext()
    resolver = local_ctx.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_ctx
    )
    ctx = resolver.resolve(
        "uno:socket,host=localhost,port=8100;urp;StarOffice.ComponentContext"
    )
    smgr = ctx.ServiceManager
    doc = smgr.createInstanceWithContext("com.sun.star.presentation.PresentationDocument", ctx)
    slides = doc.getDrawPages()
    slide = slides.getByIndex(0)
    doc.storeToURL("file:///path/to/presentation.odp", ())
    doc.close(True)
```

### Converting Presentations

```bash
# ODP to PPTX
soffice --headless --convert-to pptx presentation.odp

# ODP to PDF
soffice --headless --convert-to pdf presentation.odp

# PPTX to ODP
soffice --headless --convert-to odp presentation.pptx

# Batch convert
for file in *.odp; do
    soffice --headless --convert-to pdf "$file"
done
```

### Template-Based Generation
```python
import subprocess
import tempfile
from pathlib import Path

def generate_from_template(template_path, content, output_path):
    with tempfile.TemporaryDirectory() as tmpdir:
        subprocess.run(['unzip', '-q', template_path, '-d', tmpdir])
        content_file = Path(tmpdir) / 'content.xml'
        content_xml = content_file.read_text()
        for key, value in content.items():
            content_xml = content_xml.replace(f'${{{key}}}', str(value))
        content_file.write_text(content_xml)
        subprocess.run(['zip', '-rq', output_path, '.'], cwd=tmpdir)
    return output_path
```

## Format Conversion Reference

### Supported Input Formats
- ODP (native), PPTX, PPT, PDF

### Supported Output Formats
- ODP, PPTX, PDF, HTML, SWF

## Command-Line Reference

```bash
soffice --headless
soffice --headless --convert-to <format> <file>
soffice --impress  # Impress
```

## Python Libraries

```bash
pip install ezodf     # ODF handling
pip install odfpy     # ODF manipulation
```

## Best Practices

1. Use slide masters for consistency
2. Create templates for recurring presentations
3. Embed fonts for PDF distribution
4. Use vector graphics when possible
5. Store ODP source files in version control
6. Test conversions thoroughly
7. Keep file sizes manageable

## Troubleshooting

### Cannot open socket
```bash
killall soffice.bin
soffice --headless --accept="socket,host=localhost,port=8100;urp;"
```

## Resources

- [LibreOffice Impress Guide](https://documentation.libreoffice.org/)
- [UNO API Reference](https://api.libreoffice.org/)

## Related Skills

- writer
- calc
- draw
- base
- pptx-official
- workflow-automation

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
