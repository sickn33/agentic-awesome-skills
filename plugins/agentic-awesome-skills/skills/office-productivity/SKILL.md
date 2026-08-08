---
name: office-productivity
description: "Office productivity workflow covering document creation, spreadsheet automation, presentation generation, and integration with LibreOffice and Microsoft Office formats."
category: workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# Office Productivity Workflow Bundle

## Overview

Comprehensive office productivity workflow for document creation, spreadsheet automation, presentation generation, and format conversion using LibreOffice and Microsoft Office tools.

## When to Use This Workflow

Use this workflow when:
- Creating office documents programmatically
- Automating document workflows
- Converting between document formats
- Generating reports
- Creating presentations from data
- Processing spreadsheets

## Workflow Phases

### Phase 1: Document Creation

#### Skills to Invoke
- `libreoffice-writer` - LibreOffice Writer
- `docx-official` - Microsoft Word
- `pdf-official` - PDF handling

#### Actions
1. Design document template
2. Create document structure
3. Add content programmatically
4. Apply formatting
5. Export to required formats

#### Copy-Paste Prompts
```
Use @libreoffice-writer to create ODT documents
```

```
Use @docx-official to create Word documents
```

### Phase 2: Spreadsheet Automation

#### Skills to Invoke
- `libreoffice-calc` - LibreOffice Calc
- `xlsx-official` - Excel spreadsheets
- `googlesheets-automation` - Google Sheets

#### Actions
1. Design spreadsheet structure
2. Create formulas
3. Import data
4. Generate charts
5. Export reports

#### Copy-Paste Prompts
```
Use @libreoffice-calc to create ODS spreadsheets
```

```
Use @xlsx-official to create Excel reports
```

### Phase 3: Presentation Generation

#### Skills to Invoke
- `libreoffice-impress` - LibreOffice Impress
- `pptx-official` - PowerPoint
- `frontend-slides` - HTML slides
- `nanobanana-ppt-skills` - AI PPT generation

#### Actions
1. Design slide template
2. Generate slides from data
3. Add charts and graphics
4. Apply animations
5. Export presentations

#### Copy-Paste Prompts
```
Use @libreoffice-impress to create ODP presentations
```

```
Use @pptx-official to create PowerPoint presentations
```

```
Use @frontend-slides to create HTML presentations
```

### Phase 4: Format Conversion

#### Skills to Invoke
- `libreoffice-writer` - Document conversion
- `libreoffice-calc` - Spreadsheet conversion
- `pdf-official` - PDF conversion

#### Actions
1. Identify source format
2. Choose target format
3. Perform conversion
4. Verify quality
5. Batch process files

#### Copy-Paste Prompts
```
Use @libreoffice-writer to convert documents
```

### Phase 5: Document Automation

#### Skills to Invoke
- `libreoffice-writer` - Mail merge
- `workflow-automation` - Workflow automation
- `file-organizer` - File organization

#### Actions
1. Design automation workflow
2. Create templates
3. Set up data sources
4. Generate documents
5. Distribute outputs

#### Copy-Paste Prompts
```
Use @libreoffice-writer to perform mail merge
```

```
Use @workflow-automation to automate document workflows
```

### Phase 6: Graphics and Diagrams

#### Skills to Invoke
- `libreoffice-draw` - Vector graphics
- `canvas-design` - Canvas design
- `mermaid-expert` - Diagram generation

#### Actions
1. Design graphics
2. Create diagrams
3. Generate charts
4. Export images
5. Integrate with documents

#### Copy-Paste Prompts
```
Use @libreoffice-draw to create vector graphics
```

```
Use @mermaid-expert to create diagrams
```

### Phase 7: Database Integration

#### Skills to Invoke
- `libreoffice-base` - LibreOffice Base
- `database-architect` - Database design

#### Actions
1. Connect to data sources
2. Create forms
3. Design reports
4. Automate queries
5. Generate output

#### Copy-Paste Prompts
```
Use @libreoffice-base to create database reports
```

## Office Application Workflows

### LibreOffice
```
Skills: libreoffice-writer, libreoffice-calc, libreoffice-impress, libreoffice-draw, libreoffice-base
Formats: ODT, ODS, ODP, ODG, ODB
```

### Microsoft Office
```
Skills: docx-official, xlsx-official, pptx-official
Formats: DOCX, XLSX, PPTX
```

### Google Workspace
```
Skills: googlesheets-automation, google-drive-automation, gmail-automation
Formats: Google Docs, Sheets, Slides
```

## Quality Gates

- [ ] Documents formatted correctly
- [ ] Formulas working
- [ ] Presentations complete
- [ ] Conversions successful
- [ ] Automation tested
- [ ] Files organized

## Related Workflow Bundles

- `development` - Application development
- `documentation` - Documentation generation
- `database` - Data integration

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
