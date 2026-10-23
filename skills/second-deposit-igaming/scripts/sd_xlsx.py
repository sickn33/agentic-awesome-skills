"""Запись XLSX без сторонних библиотек: листы с оформленной шапкой, ширинами колонок, закрепленной первой строкой,
датами и суммами в формате Excel. Нужен для примера выгрузки и демо-данных в том же формате.

    sh = Sheet('Депозиты', widths=[12, 18, 10], tab='4E47FF')
    sh.row(('player_id', 'header'), ('created_at', 'header'), ('amount', 'header'))
    sh.row(100231, (datetime(2026, 10, 6, 19, 5), 'datetime'), (50, 'money'))
    write('example.xlsx', [sh])
"""
import datetime as dt
import zipfile
import math
import re
from xml.sax.saxutils import escape, quoteattr

EXCEL0 = dt.datetime(1899, 12, 30)
STYLES = {'default': 0, 'header': 1, 'datetime': 2, 'date': 3, 'money': 4, 'wrap': 5, 'title': 6, 'note': 7,
          'label': 8, 'chip': 9, 'int': 10, 'section': 11}
STYLES_XML = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="dd.mm.yyyy hh:mm"/><numFmt numFmtId="165" formatCode="dd.mm.yyyy"/><numFmt numFmtId="166" formatCode="#,##0.00"/></numFmts>
<fonts count="5">
<font><sz val="11"/><color rgb="FF12142B"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="16"/><color rgb="FF12142B"/><name val="Calibri"/><family val="2"/></font>
<font><i/><sz val="11"/><color rgb="FF5B6478"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF12142B"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF4E47FF"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF4D6"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFECEBFF"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFE3E8EF"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="12">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="4" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>"""


def col_name(i):
    s = ''
    i += 1
    while i:
        i, r = divmod(i - 1, 26)
        s = chr(65 + r) + s
    return s


class Sheet:
    def __init__(self, name, widths=(), tab=None, freeze=True):
        if not name or len(name) > 31 or re.search(r'[\[\]:*?/\\]', name):
            raise ValueError('invalid Excel sheet name')
        if tab and not re.fullmatch(r'[0-9A-Fa-f]{6}', tab):
            raise ValueError('invalid tab color')
        self.name, self.widths, self.tab, self.freeze = name, list(widths), tab, freeze
        self.rows, self.merges = [], []

    def row(self, *cells, height=None, merge=None):
        """Ячейка: значение или (значение, стиль). merge=N объединяет первые N ячеек строки."""
        self.rows.append((cells, height))
        if merge:
            r = len(self.rows)
            self.merges.append(f'A{r}:{col_name(merge - 1)}{r}')

    def xml(self):
        out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
               '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
               'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">']
        if self.tab:
            out.append(f'<sheetPr><tabColor rgb="FF{self.tab}"/></sheetPr>')
        ncols = max([len(c) for c, _ in self.rows] + [len(self.widths), 1])
        out.append(f'<dimension ref="A1:{col_name(ncols - 1)}{max(1, len(self.rows))}"/>')
        if self.freeze:
            out.append('<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>'
                       '<selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>')
        else:
            out.append('<sheetViews><sheetView workbookViewId="0"/></sheetViews>')
        out.append('<sheetFormatPr defaultRowHeight="15"/>')
        if self.widths:
            out.append('<cols>' + ''.join(f'<col min="{i + 1}" max="{i + 1}" width="{w}" customWidth="1"/>' for i, w in enumerate(self.widths)) + '</cols>')
        out.append('<sheetData>')
        for ri, (cells, height) in enumerate(self.rows, 1):
            attrs = f' ht="{height}" customHeight="1"' if height else ''
            parts = []
            for ci, cell in enumerate(cells):
                value, style = cell if isinstance(cell, tuple) else (cell, None)
                ref = f'{col_name(ci)}{ri}'
                if isinstance(value, dt.datetime):
                    serial = (value - EXCEL0).total_seconds() / 86400
                    s = STYLES[style or ('date' if value.time() == dt.time() else 'datetime')]
                    parts.append(f'<c r="{ref}" s="{s}"><v>{serial:.10f}</v></c>')
                    continue
                s = STYLES.get(style or 'default', 0)
                sa = f' s="{s}"' if s else ''
                if value is None or value == '':
                    if s:
                        parts.append(f'<c r="{ref}"{sa}/>')
                elif isinstance(value, bool):
                    parts.append(f'<c r="{ref}"{sa} t="inlineStr"><is><t>{"Yes" if value else ""}</t></is></c>')
                elif isinstance(value, (int, float)):
                    if not math.isfinite(value):
                        raise ValueError('non-finite spreadsheet number')
                    parts.append(f'<c r="{ref}"{sa}><v>{value}</v></c>')
                else:
                    parts.append(f'<c r="{ref}"{sa} t="inlineStr"><is><t xml:space="preserve">{escape(str(value))}</t></is></c>')
            out.append(f'<row r="{ri}"{attrs}>' + ''.join(parts) + '</row>')
        out.append('</sheetData>')
        if self.merges:
            out.append(f'<mergeCells count="{len(self.merges)}">' + ''.join(f'<mergeCell ref="{m}"/>' for m in self.merges) + '</mergeCells>')
        out.append('<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>')
        return ''.join(out)


def write(path, sheets):
    n = len(sheets)
    if not n or len({s.name.casefold() for s in sheets}) != n:
        raise ValueError('workbook needs uniquely named sheets')
    ct = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
          + ''.join(f'<Override PartName="/xl/worksheets/sheet{i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(n))
          + '</Types>')
    rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
    wb = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
          'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>'
          + ''.join(f'<sheet name={quoteattr(s.name)} sheetId="{i + 1}" r:id="rId{i + 1}"/>' for i, s in enumerate(sheets)) + '</sheets></workbook>')
    wrels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
             + ''.join(f'<Relationship Id="rId{i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{i + 1}.xml"/>' for i in range(n))
             + f'<Relationship Id="rId{n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>')
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', ct)
        z.writestr('_rels/.rels', rels)
        z.writestr('xl/workbook.xml', wb)
        z.writestr('xl/_rels/workbook.xml.rels', wrels)
        z.writestr('xl/styles.xml', STYLES_XML)
        for i, s in enumerate(sheets):
            z.writestr(f'xl/worksheets/sheet{i + 1}.xml', s.xml())
