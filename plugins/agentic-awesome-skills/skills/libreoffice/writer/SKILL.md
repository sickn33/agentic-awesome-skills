---
name: writer
description: "Document creation, format conversion (ODT/DOCX/PDF), mail merge, and automation with LibreOffice Writer."
category: document-processing
risk: safe
source: personal
date_added: "2026-02-27"
---

# LibreOffice Writer

## Overview

LibreOffice Writer skill for creating, editing, converting, and automating document workflows using the native ODT (OpenDocument Text) format.

## When to Use This Skill

Use this skill when:
- Creating new documents in ODT format
- Converting documents between formats (ODT <-> DOCX, PDF, HTML, RTF, TXT)
- Automating document generation workflows
- Performing batch document operations
- Creating templates and standardized document formats

## Core Capabilities

### 1. Document Creation
- Create new ODT documents from scratch
- Generate documents from templates
- Create mail merge documents
- Build forms with fillable fields

### 2. Format Conversion
- ODT to other formats: DOCX, PDF, HTML, RTF, TXT, EPUB
- Other formats to ODT: DOCX, DOC, RTF, HTML, TXT
- Batch conversion of multiple documents

### 3. Document Automation
- Template-based document generation
- Mail merge with data sources (CSV, spreadsheet, database)
- Batch document processing
- Automated report generation

### 4. Content Manipulation
- Text extraction and insertion
- Style management and application
- Table creation and manipulation
- Header/footer management

### 5. Integration
- Command-line automation via soffice
- Python scripting with UNO
- Integration with workflow automation tools

## Workflows

### Creating a New Document

#### Method 1: Command-Line
```bash
soffice --writer template.odt
```

#### Method 2: Python with UNO
```python
import uno

def create_document():
    local_ctx = uno.getComponentContext()
    resolver = local_ctx.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_ctx
    )
    ctx = resolver.resolve(
        "uno:socket,host=localhost,port=8100;urp;StarOffice.ComponentContext"
    )
    smgr = ctx.ServiceManager
    doc = smgr.createInstanceWithContext("com.sun.star.text.TextDocument", ctx)
    text = doc.Text
    cursor = text.createTextCursor()
    text.insertString(cursor, "Hello from LibreOffice Writer!", 0)
    doc.storeToURL("file:///path/to/document.odt", ())
    doc.close(True)
```

#### Method 3: Using odfpy
```python
from odf.opendocument import OpenDocumentText
from odf.text import P, H

doc = OpenDocumentText()
h1 = H(outlinelevel='1', text='Document Title')
doc.text.appendChild(h1)
doc.save("document.odt")
```

### Converting Documents

```bash
# ODT to DOCX
soffice --headless --convert-to docx document.odt

# ODT to PDF
soffice --headless --convert-to pdf document.odt

# DOCX to ODT
soffice --headless --convert-to odt document.docx

# Batch convert
for file in *.odt; do
    soffice --headless --convert-to pdf "$file"
done
```

### Template-Based Generation
```python
import subprocess
import tempfile
from pathlib import Path

def generate_from_template(template_path, variables, output_path):
    with tempfile.TemporaryDirectory() as tmpdir:
        subprocess.run(['unzip', '-q', template_path, '-d', tmpdir])
        content_file = Path(tmpdir) / 'content.xml'
        content = content_file.read_text()
        for key, value in variables.items():
            content = content.replace(f'${{{key}}}', str(value))
        content_file.write_text(content)
        subprocess.run(['zip', '-rq', output_path, '.'], cwd=tmpdir)
    return output_path
```

## Format Conversion Reference

### Supported Input Formats
- ODT (native), DOCX, DOC, RTF, HTML, TXT, EPUB

### Supported Output Formats
- ODT, DOCX, PDF, PDF/A, HTML, RTF, TXT, EPUB

## Command-Line Reference

```bash
soffice --headless
soffice --headless --convert-to <format> <file>
soffice --writer    # Writer
soffice --calc      # Calc
soffice --impress   # Impress
soffice --draw      # Draw
```

## Python Libraries

```bash
pip install odfpy     # ODF manipulation
pip install ezodf     # Easier ODF handling
```

## Best Practices

1. Use styles for consistency
2. Create templates for recurring documents
3. Ensure accessibility (heading hierarchy, alt text)
4. Fill document metadata
5. Store ODT source files in version control
6. Test conversions thoroughly
7. Embed fonts for PDF distribution
8. Handle conversion failures gracefully
9. Log automation operations
10. Clean temporary files

## Troubleshooting

### Cannot open socket
```bash
killall soffice.bin
soffice --headless --accept="socket,host=localhost,port=8100;urp;"
```

### Conversion Quality Issues
```bash
soffice --headless --convert-to pdf:writer_pdf_Export document.odt
```

## Resources

- [LibreOffice Writer Guide](https://documentation.libreoffice.org/)
- [LibreOffice SDK](https://wiki.documentfoundation.org/Documentation/DevGuide)
- [UNO API Reference](https://api.libreoffice.org/)
- [odfpy](https://pypi.org/project/odfpy/)

## Related Skills

- calc
- impress
- draw
- base
- docx-official
- pdf-official
- workflow-automation

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
