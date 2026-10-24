---
name: calc
description: "Spreadsheet creation, format conversion (ODS/XLSX/CSV), formulas, data automation with LibreOffice Calc."
category: spreadsheet-processing
risk: safe
source: personal
date_added: "2026-02-27"
---

# LibreOffice Calc

## Overview

LibreOffice Calc skill for creating, editing, converting, and automating spreadsheet workflows using the native ODS (OpenDocument Spreadsheet) format.

## When to Use This Skill

Use this skill when:
- Creating new spreadsheets in ODS format
- Converting between ODS, XLSX, CSV, PDF formats
- Automating data processing and analysis
- Creating formulas, charts, and pivot tables
- Batch processing spreadsheet operations

## Core Capabilities

### 1. Spreadsheet Creation
- Create new ODS spreadsheets from scratch
- Generate spreadsheets from templates
- Create data entry forms
- Build dashboards and reports

### 2. Format Conversion
- ODS to other formats: XLSX, CSV, PDF, HTML
- Other formats to ODS: XLSX, XLS, CSV, DBF
- Batch conversion of multiple files

### 3. Data Automation
- Formula automation and calculations
- Data import from CSV, database, APIs
- Data export to various formats
- Batch data processing

### 4. Data Analysis
- Pivot tables and data summarization
- Statistical functions and analysis
- Data validation and filtering
- Conditional formatting

### 5. Integration
- Command-line automation via soffice
- Python scripting with UNO
- Database connectivity

## Workflows

### Creating a New Spreadsheet

#### Method 1: Command-Line
```bash
soffice --calc template.ods
```

#### Method 2: Python with UNO
```python
import uno

def create_spreadsheet():
    local_ctx = uno.getComponentContext()
    resolver = local_ctx.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_ctx
    )
    ctx = resolver.resolve(
        "uno:socket,host=127.0.0.1,port=8100;urp;StarOffice.ComponentContext"
    )
    smgr = ctx.ServiceManager
    desktop = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
    doc = desktop.loadComponentFromURL("private:factory/scalc", "_blank", 0, ())
    sheets = doc.getSheets()
    sheet = sheets.getByIndex(0)
    cell = sheet.getCellByPosition(0, 0)
    cell.setString("Hello from LibreOffice Calc!")
    doc.storeToURL("file:///path/to/spreadsheet.ods", ())
    doc.close(True)
```

#### Method 3: Using ezodf
```python
import ezodf

doc = ezodf.newdoc('ods', 'spreadsheet.ods')
sheet = ezodf.Sheet('Sheet1', size=(10, 10))
doc.sheets += sheet
sheet['A1'].set_value('Hello')
sheet['B1'].set_value('World')
doc.save()
```

### Converting Spreadsheets

```bash
# ODS to XLSX
soffice --headless --convert-to xlsx spreadsheet.ods

# ODS to CSV
soffice --headless --convert-to csv spreadsheet.ods

# ODS to PDF
soffice --headless --convert-to pdf spreadsheet.ods

# XLSX to ODS
soffice --headless --convert-to ods spreadsheet.xlsx

# Batch convert
for file in *.ods; do
    soffice --headless --convert-to xlsx "$file"
done
```

### Formula Automation
```python
import uno

def create_formula_spreadsheet():
    local_ctx = uno.getComponentContext()
    resolver = local_ctx.ServiceManager.createInstanceWithContext(
        "com.sun.star.bridge.UnoUrlResolver", local_ctx
    )
    ctx = resolver.resolve(
        "uno:socket,host=127.0.0.1,port=8100;urp;StarOffice.ComponentContext"
    )
    smgr = ctx.ServiceManager
    desktop = smgr.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
    doc = desktop.loadComponentFromURL("private:factory/scalc", "_blank", 0, ())
    sheet = doc.getSheets().getByIndex(0)
    
    sheet.getCellByPosition(0, 0).setValue(100)
    sheet.getCellByPosition(0, 1).setValue(200)
    
    cell = sheet.getCellByPosition(0, 2)
    cell.setFormula("=SUM(A1:A2)")
    
    doc.storeToURL("file:///path/to/formulas.ods", ())
    doc.close(True)
```

## Format Conversion Reference

### Supported Input Formats
- ODS (native), XLSX, XLS, CSV, DBF, HTML

### Supported Output Formats
- ODS, XLSX, XLS, CSV, PDF, HTML

## Command-Line Reference

```bash
soffice --headless
soffice --headless --convert-to <format> <file>
soffice --calc  # Calc
```

## Python Libraries

```bash
pip install ezodf     # ODS handling
pip install odfpy     # ODF manipulation
pip install pandas    # Data analysis
```

## Best Practices

1. Use named ranges for clarity
2. Document complex formulas
3. Use data validation for input control
4. Create templates for recurring reports
5. Version only approved nonsensitive source spreadsheets
6. Test conversions thoroughly
7. Use CSV for data exchange
8. Handle conversion failures gracefully

## Troubleshooting

### Cannot open socket
```bash
# Inspect the listener and stop only the task-owned process after saving its documents.
soffice --headless --accept="socket,host=127.0.0.1,port=8100;urp;"
```

## Resources

- [LibreOffice Calc Guide](https://documentation.libreoffice.org/)
- [UNO API Reference](https://api.libreoffice.org/)
- [ezodf Documentation](http://ezodf.rst2.org/)

## Related Skills

- writer
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
