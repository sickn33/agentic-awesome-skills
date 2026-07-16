---
name: draw
description: "Vector graphics and diagram creation, format conversion (ODG/SVG/PDF) with LibreOffice Draw."
category: graphics-processing
risk: safe
source: personal
date_added: "2026-02-27"
---

# LibreOffice Draw

## Overview

LibreOffice Draw skill for creating, editing, converting, and automating vector graphics and diagram workflows using the native ODG (OpenDocument Drawing) format.

## When to Use This Skill

Use this skill when:
- Creating vector graphics and diagrams in ODG format
- Converting between ODG, SVG, PDF, PNG formats
- Automating diagram and flowchart generation
- Creating technical drawings and schematics
- Batch processing graphics operations

## Core Capabilities

### 1. Graphics Creation
- Create new ODG drawings from scratch
- Generate diagrams from templates
- Create flowcharts and org charts
- Design technical drawings

### 2. Format Conversion
- ODG to other formats: SVG, PDF, PNG, JPG
- Other formats to ODG: SVG, PDF
- Batch conversion of multiple files

### 3. Diagram Automation
- Template-based diagram generation
- Automated flowchart creation
- Dynamic shape generation
- Batch diagram production

### 4. Graphics Manipulation
- Shape creation and manipulation
- Path and bezier curve editing
- Layer management
- Text and label insertion

### 5. Integration
- Command-line automation via soffice
- Python scripting with UNO
- Integration with workflow tools

## Workflows

### Creating a New Drawing

#### Method 1: Command-Line
```bash
soffice --draw template.odg
```

#### Method 2: Python with UNO
```python
import uno

def create_drawing():
    local_ctx = uno.getComponentContext()
    resolver = local_ctx.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_ctx
    )
    ctx = resolver.resolve(
        "uno:socket,host=localhost,port=8100;urp;StarOffice.ComponentContext"
    )
    smgr = ctx.ServiceManager
    doc = smgr.createInstanceWithContext("com.sun.star.drawing.DrawingDocument", ctx)
    page = doc.getDrawPages().getByIndex(0)
    doc.storeToURL("file:///path/to/drawing.odg", ())
    doc.close(True)
```

### Converting Drawings

```bash
# ODG to SVG
soffice --headless --convert-to svg drawing.odg

# ODG to PDF
soffice --headless --convert-to pdf drawing.odg

# ODG to PNG
soffice --headless --convert-to png:PNG_drawing drawing.odg

# SVG to ODG
soffice --headless --convert-to odg drawing.svg

# Batch convert
for file in *.odg; do
    soffice --headless --convert-to pdf "$file"
done
```

## Format Conversion Reference

### Supported Input Formats
- ODG (native), SVG, PDF

### Supported Output Formats
- ODG, SVG, PDF, PNG, JPG, GIF, BMP, WMF, EMF

## Command-Line Reference

```bash
soffice --headless
soffice --headless --convert-to <format> <file>
soffice --draw  # Draw
```

## Python Libraries

```bash
pip install ezodf     # ODF handling
pip install odfpy     # ODF manipulation
pip install svgwrite  # SVG generation
```

## Best Practices

1. Use layers for organization
2. Create templates for recurring diagrams
3. Use vector formats for scalability
4. Name objects for easy reference
5. Store ODG source files in version control
6. Test conversions thoroughly
7. Export to SVG for web use

## Troubleshooting

### Cannot open socket
```bash
killall soffice.bin
soffice --headless --accept="socket,host=localhost,port=8100;urp;"
```

### Quality Issues in PNG Export
```bash
soffice --headless --convert-to png:PNG_drawing_Export \
  --filterData='{"Width":2048,"Height":2048}' drawing.odg
```

## Resources

- [LibreOffice Draw Guide](https://documentation.libreoffice.org/)
- [UNO API Reference](https://api.libreoffice.org/)
- [SVG Specification](https://www.w3.org/TR/SVG/)

## Related Skills

- writer
- calc
- impress
- base
- workflow-automation

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
