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
        "uno:socket,host=127.0.0.1,port=8100;urp;StarOffice.ComponentContext"
    )
    smgr = ctx.ServiceManager
    desktop = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
    doc = desktop.loadComponentFromURL("private:factory/swriter", "_blank", 0, ())
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

### Template-based generation

Load an approved template through UNO with an AsTemplate property, then replace defined document placeholders through the document model and save to a fresh destination. The previous unzip/string-replace/zip example was removed: it neither escaped XML nor handled split text runs/ODF packaging correctly, and unchecked subprocesses could return a nonexistent output. No templating implementation is bundled here; use an audited ODF-aware implementation and verify layout.

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
# Inspect the listener and stop only the task-owned process after saving its documents.
soffice --headless --accept="socket,host=127.0.0.1,port=8100;urp;"
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
- workflow-automation

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Automation and document limits

Verify the actual LibreOffice version, filters, Python UNO binding and database drivers; installing unrelated Python libraries does not provide UNO. Bind any UNO listener to loopback in a separate task-owned profile and stop it after use; UNO is not an authenticated sandbox. Do not terminate all office processes or expose the listener publicly. Use a fresh private output directory, check expected file type/nonempty output and inspect the rendered result; exit zero alone is insufficient.

Opening documents can invoke macros, external links or embedded content: use approved inputs with macros/updates disabled and isolate untrusted conversions. Format conversion may lose layout, formulas, links, notes, multiple sheets/pages or features. Retain originals, clarify CSV sheet/delimiter/encoding and preserve formula/identifier semantics. Do not automatically install packages, publish documents or put sensitive records in Git. These examples were statically reviewed only; no LibreOffice process or conversion was run.
