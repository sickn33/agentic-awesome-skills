"""Общие функции скилла second-deposit: чтение выгрузок (CSV и XLSX без сторонних библиотек),
разбор дат и сумм, загрузка mapping.json и приведение выгрузок к единой схеме.

Схема после загрузки:
  deposits     [(player, time, amount, status, method, country, is_ftd, decline)]
               status: success | declined | abandoned | other; is_ftd: True | False | None (нет колонки);
               decline: limit | block | None (причина отказа по decline_reasons, если колонка reason сопоставлена)
  withdrawals  [(player, time, amount, kind, done_time)]  kind: paid | pending | rejected | cancelled
  bonuses      [(player, time, wager, name, amount, status)]  status: active | lost | expired | completed | cancelled | None
  bets         [(player, time, has_clock, bets, wins, rounds, end_time)]
  players      {player: {'reg': time, 'ftd': time первого депозита, 'country': str, 'source': str, 'rg': [колонки флагов], 'kyc': time}}
"""
import csv
import datetime as dt
import glob
import io
import json
import math
import os
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

csv.field_size_limit(1_000_000)
ENCODINGS = ('utf-8-sig', 'utf-8', 'cp1251', 'latin-1')
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
EPOCH = dt.datetime(1970, 1, 1)
EXCEL0 = dt.datetime(1899, 12, 30)
FALSY = {'', '0', '0.0', 'false', 'no', 'n', 'нет', 'ні', '-', 'none', 'null', 'nan', 'off', 'n/a'}
STATUSES = ('success', 'declined', 'abandoned', 'pending', 'cancelled')
BONUS_STATUSES = ('active', 'lost', 'expired', 'completed', 'cancelled')
DECLINE_KINDS = ('limit', 'block')


class MappingError(Exception):
    pass


# ---------- чтение файлов ----------

def read_table(path, sheet=None):
    """(header, rows): rows это списки строк той же длины, что и header."""
    if os.path.getsize(path) > 100_000_000:
        raise MappingError('файл превышает лимит 100 MB; разделите выгрузку')
    if path.lower().endswith(('.xlsx', '.xlsm')):
        header, rows = read_xlsx(path, sheet)
    else:
        raw = open(path, 'rb').read()
        text = raw.decode('latin-1')
        for enc in ENCODINGS:
            try:
                text = raw.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        first = text.split('\n', 1)[0]
        delim = max(',;\t|', key=first.count)
        rows = [r for r in csv.reader(io.StringIO(text), delimiter=delim) if any(c.strip() for c in r)]
        if not rows:
            return [], []
        header, rows = rows[0], rows[1:]
    header = [str(h).strip() for h in header]
    n = len(header)
    return header, [(list(r) + [''] * n)[:n] for r in rows]


def _col_index(ref):
    i = 0
    match = re.fullmatch(r'([A-Z]{1,3})([1-9][0-9]*)', ref or '')
    if not match or int(match.group(2)) > 1048576:
        raise MappingError('неверная ссылка ячейки XLSX')
    for ch in match.group(1):
        i = i * 26 + ord(ch) - 64
    if i > 16384:
        raise MappingError('слишком много колонок XLSX')
    return i - 1


def _date_styles(z):
    if 'xl/styles.xml' not in z.namelist():
        return set()
    st = ET.fromstring(z.read('xl/styles.xml'))
    custom = {}
    nf = st.find('m:numFmts', NS)
    if nf is not None:
        for f in nf:
            custom[int(f.get('numFmtId'))] = f.get('formatCode', '')
    out = set()
    xfs = st.find('m:cellXfs', NS)
    for i, xf in enumerate(list(xfs) if xfs is not None else []):
        fid = int(xf.get('numFmtId', 0))
        code = re.sub(r'"[^"]*"|\[[^\]]*\]', '', custom.get(fid, '').lower())
        if 14 <= fid <= 22 or 45 <= fid <= 47 or re.search(r'[dmyhs]', code):
            out.add(i)
    return out


def read_xlsx(path, sheet=None):
    z = zipfile.ZipFile(path)
    if sum(i.file_size for i in z.infolist()) > 250_000_000 or len(z.infolist()) > 10000:
        z.close()
        raise MappingError('XLSX превышает лимит распаковки 250 MB / 10000 файлов')
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si', NS):
            shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['m'])))
    wb = ET.fromstring(z.read('xl/workbook.xml'))
    sheets = [(s.get('name'), s.get('{%s}id' % NS['r'])) for s in wb.find('m:sheets', NS)]
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    target = {r.get('Id'): r.get('Target') for r in rels}
    if not sheets or (sheet is not None and not any(n == sheet for n, _ in sheets)):
        z.close()
        raise MappingError('запрошенный лист XLSX отсутствует')
    _, rid = next((n, r) for n, r in sheets if sheet in (None, n))
    props = wb.find('m:workbookPr', NS)
    epoch = dt.datetime(1904, 1, 1) if props is not None and props.get('date1904', '').lower() in ('1', 'true') else EXCEL0
    t = target[rid].lstrip('/')
    inner = t if t.startswith('xl/') else 'xl/' + t
    dates = _date_styles(z)
    rows = []
    for row in ET.fromstring(z.read(inner)).iter('{%s}row' % NS['m']):
        cells = {}
        for c in row.findall('m:c', NS):
            typ, v = c.get('t'), c.find('m:v', NS)
            if typ == 's':
                val = shared[int(v.text)] if v is not None else ''
            elif typ == 'inlineStr':
                val = ''.join(x.text or '' for x in c.iter('{%s}t' % NS['m']))
            elif typ == 'b':
                val = 'TRUE' if v is not None and v.text == '1' else 'FALSE'
            else:
                val = v.text if v is not None and v.text is not None else ''
                if val and c.get('s') and int(c.get('s')) in dates:
                    try:
                        t = epoch + dt.timedelta(days=float(val))
                        val = (t + dt.timedelta(microseconds=500000)).replace(microsecond=0).strftime('%Y-%m-%d %H:%M:%S')
                    except (ValueError, OverflowError):
                        pass
            cells[_col_index(c.get('r'))] = val
        if cells:
            rows.append([cells.get(i, '') for i in range(max(cells) + 1)])
    z.close()
    return (rows[0], rows[1:]) if rows else ([], [])


def list_sheets(path):
    wb = ET.fromstring(zipfile.ZipFile(path).read('xl/workbook.xml'))
    return [s.get('name') for s in wb.find('m:sheets', NS)]


# ---------- разбор значений ----------

RX_ISO = re.compile(r'^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?)?\s*(Z|UTC|[+-]\d{2}:?\d{2})?$', re.I)
RX_DMY = re.compile(r'^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,]\d+)?)?\s*([AaPp]\.?[Mm]\.?)?)?$')
TEXT_FORMATS = ('%d %b %Y %H:%M:%S', '%d %b %Y %H:%M', '%d %b %Y', '%b %d, %Y %H:%M:%S', '%b %d, %Y %H:%M',
                '%b %d, %Y %I:%M %p', '%b %d, %Y', '%d-%b-%Y %H:%M:%S', '%d-%b-%Y', '%d %B %Y', '%B %d, %Y')


RX_TZ = re.compile(r'(Z|UTC|[+-]\d{2}:?\d{2})$', re.I)


def has_tz(s):
    """Есть ли в значении явный часовой пояс (Z, UTC, +03:00)."""
    return bool(RX_TZ.search(str(s).strip())) and bool(RX_ISO.match(str(s).strip()))


def parse_tz(v):
    """Сдвиг пояса файла в часах: "+03:00", "-5", 3, "UTC". None, если не задан."""
    if v is None or v == '':
        return None
    if isinstance(v, (int, float)):
        if not math.isfinite(v) or abs(v) > 14:
            raise MappingError('часовой пояс должен быть конечным, от -14 до +14 часов')
        return float(v)
    v = str(v).strip().upper()
    if v in ('UTC', 'Z', 'GMT'):
        return 0.0
    m = re.fullmatch(r'(?:UTC|GMT)?\s*([+-])?(\d{1,2})(?::?(\d{2}))?', v)
    if not m:
        raise MappingError(f'не понял часовой пояс "{v}": нужно "+03:00", "-05:00" или "UTC"')
    hours = int(m.group(2)) + int(m.group(3) or 0) / 60
    if int(m.group(3) or 0) >= 60 or hours > 14:
        raise MappingError('неверное смещение часового пояса')
    return -hours if m.group(1) == '-' else hours


def parse_time(s, dayfirst=True, tz=None):
    """Дата и время в наивном UTC: явный пояс из строки или tz файла (часы). None, если не разобрали."""
    t = _parse_time(s, dayfirst)
    if t is not None and tz and not has_tz(s):
        t -= dt.timedelta(hours=tz)
    return t


def _parse_time(s, dayfirst=True):
    if s is None:
        return None
    s = str(s).strip()
    if not s:
        return None
    m = RX_ISO.match(s)
    if m:
        y, mo, d, hh, mi, ss, tz = m.groups()
        try:
            t = dt.datetime(int(y), int(mo), int(d), int(hh or 0), int(mi or 0), int(ss or 0))
        except ValueError:
            return None
        if tz and tz.upper() not in ('Z', 'UTC'):
            sign = 1 if tz[0] == '+' else -1
            z = tz[1:].replace(':', '')
            zh, zm = int(z[:2]), int(z[2:4] or 0)
            if zm >= 60 or zh > 14 or (zh == 14 and zm):
                return None
            try:
                t -= sign * dt.timedelta(hours=zh, minutes=zm)
            except OverflowError:
                return None
        return t
    m = RX_DMY.match(s)
    if m:
        a, b, y, hh, mi, ss, ap = m.groups()
        y = int(y) + (2000 if int(y) < 100 else 0)
        d, mo = (int(a), int(b)) if dayfirst else (int(b), int(a))
        if mo > 12 and d <= 12:
            d, mo = mo, d
        h = int(hh or 0)
        if ap:
            h = h % 12 + (12 if ap.lower().startswith('p') else 0)
        try:
            return dt.datetime(y, mo, d, h, int(mi or 0), int(ss or 0))
        except ValueError:
            return None
    if re.fullmatch(r'\d{10}(\.\d+)?', s):
        return EPOCH + dt.timedelta(seconds=float(s))
    if re.fullmatch(r'\d{13}', s):
        return EPOCH + dt.timedelta(milliseconds=int(s))
    if re.fullmatch(r'[1-6]\d{4}(\.\d+)?', s):
        t = EXCEL0 + dt.timedelta(days=float(s))
        return (t + dt.timedelta(microseconds=500000)).replace(microsecond=0)
    for f in TEXT_FORMATS:
        try:
            return dt.datetime.strptime(s, f)
        except ValueError:
            pass
    return None


def has_clock(s):
    """Есть ли в значении время суток (иначе это дневная запись)."""
    s = str(s).strip()
    if re.search(r'\d{1,2}:\d{2}', s) or re.fullmatch(r'\d{10,13}(\.\d+)?', s):
        return not re.search(r'[ T]00:00(:00)?(\.0+)?$', s)
    return False


def parse_amount(s, decimal=None):
    if s is None:
        return None
    s = str(s).strip().replace(' ', '').replace(' ', '')
    if not s:
        return None
    if re.fullmatch(r'[-+]?\d+(\.\d+)?[eE][-+]?\d+', s):
        value = float(s)
        return value if math.isfinite(value) else None
    neg = s.startswith('-') or s.endswith('-') or (s.startswith('(') and s.endswith(')'))
    s = re.sub(r'[^\d,.]', '', s)
    if not re.search(r'\d', s):
        return None
    if decimal == ',':
        s = s.replace('.', '').replace(',', '.')
    elif decimal == '.':
        s = s.replace(',', '')
    elif ',' in s and '.' in s:
        s = s.replace('.', '').replace(',', '.') if s.rfind(',') > s.rfind('.') else s.replace(',', '')
    elif ',' in s:
        parts = s.split(',')
        s = s.replace(',', '') if (len(parts) > 2 or len(parts[-1]) == 3) else s.replace(',', '.')
    elif s.count('.') > 1:
        s = s.replace('.', '')
    try:
        v = float(s)
    except ValueError:
        return None
    return (-v if neg else v) if math.isfinite(v) else None


def norm_id(s):
    s = str(s if s is not None else '').strip()
    if re.fullmatch(r'\d+\.0+', s):
        s = s.split('.')[0]
    return s


def truthy(s):
    return str(s).strip().lower() not in FALSY


# ---------- mapping.json ----------

def load_mapping(path):
    try:
        m = json.load(open(path, encoding='utf-8'))
    except json.JSONDecodeError as e:
        raise MappingError(f'mapping.json не читается: {e}')
    m['_base'] = os.path.dirname(os.path.abspath(path))
    if 'files' not in m or not ('deposits' in m['files'] or 'transactions' in m['files']):
        raise MappingError('в mapping.json нужен files.deposits или files.transactions')
    for name, spec in m['files'].items():
        allowed = BONUS_STATUSES if name == 'bonuses' else STATUSES
        for norm in (spec.get('status') or {}):
            if norm not in allowed:
                raise MappingError(f'{name}.status: неизвестный статус "{norm}", можно {allowed}')
        for kind in (spec.get('decline_reasons') or {}):
            if kind not in DECLINE_KINDS:
                raise MappingError(f'{name}.decline_reasons: неизвестный вид "{kind}", можно {DECLINE_KINDS}')
    return m


def resolve_paths(spec, base):
    """Файлы по полю path: файл, маска или список. С "latest": true из всех совпадений берется один самый свежий
    по времени изменения: так ежедневные выгрузки копятся в одной папке, а расчет идет по последней."""
    paths = spec['path'] if isinstance(spec['path'], list) else [spec['path']]
    out = []
    for p in paths:
        p = os.path.expanduser(p)
        p = p if os.path.isabs(p) else os.path.join(base, p)
        hits = sorted(glob.glob(p))
        if not hits:
            raise MappingError(f'файл не найден: {p}')
        out += hits
    if spec.get('latest') and len(out) > 1:
        out = [max(out, key=lambda x: (os.path.getmtime(x), x))]
    return out


class Table:
    """Строки одного логического файла (несколько физических файлов склеиваются), доступ по каноническим полям."""

    def __init__(self, name, spec, base, extra=()):
        self.name, self.spec = name, spec
        self.decimal = spec.get('decimal')
        self.dayfirst = spec.get('dayfirst', True)
        self.tz = parse_tz(spec.get('tz'))
        self.tz_seen = {'explicit': 0, 'naive': 0}
        self.paths = resolve_paths(spec, base)
        self.latest = bool(spec.get('latest'))
        cols = {f: c for f, c in (spec.get('columns') or {}).items() if c}
        cols.update({'extra:' + c: c for c in extra})
        self.rows, self.idx, self.bad = [], None, {}
        for p in self.paths:
            header, rows = read_table(p, spec.get('sheet'))
            idx = {}
            for field, col in cols.items():
                if col not in header:
                    raise MappingError(f'{name}: в файле {os.path.basename(p)} нет колонки "{col}" (поле {field}). Колонки: {header}')
                idx[field] = header.index(col)
            if self.idx is not None and set(idx) != set(self.idx):
                raise MappingError(f'{name}: у файлов разные колонки')
            self.idx = idx
            self.rows += rows

    def has(self, field):
        return field in self.idx

    def get(self, row, field):
        i = self.idx.get(field)
        return row[i] if i is not None else None

    def note_bad(self, field):
        self.bad[field] = self.bad.get(field, 0) + 1

    def time(self, row, field='time'):
        raw = self.get(row, field)
        if raw is None or not str(raw).strip():
            return None
        self.tz_seen['explicit' if has_tz(raw) else 'naive'] += 1
        return parse_time(raw, self.dayfirst, self.tz)


def _value_map(spec, key):
    out = {}
    for norm, raws in (spec.get(key) or {}).items():
        for r in raws:
            out[str(r).strip().lower()] = norm
    return out


def load_data(m):
    """Читает файлы по mapping и возвращает данные в единой схеме и отчет о качестве разбора."""
    base, files = m['_base'], m['files']
    fx = {k.upper(): float(v) for k, v in (m.get('fx') or {}).items()}
    if any(not math.isfinite(v) or v <= 0 for v in fx.values()):
        raise MappingError('FX rates must be finite and positive')
    report_ccy = (m.get('currency') or 'EUR').upper()
    quality = {'files': {}, 'unmapped_status': {}, 'unmapped_type': {}, 'missing_fx': {}, 'bad_values': {},
               'deposit_status': True, 'deposit_statuses': {}, 'tz': {}, 'withdrawal_status': False,
               'withdrawal_done_time': False, 'kyc_time': False, 'rg_flags': False}
    deposits, withdrawals, bonuses, bets, players = [], [], [], [], {}
    tables = {}

    def money(table, row, amount):
        if amount is None:
            return None
        amount = abs(amount)
        if table.has('currency'):
            ccy = str(table.get(row, 'currency')).strip().upper()
            if ccy and ccy != report_ccy:
                if ccy not in fx:
                    quality['missing_fx'][ccy] = quality['missing_fx'].get(ccy, 0) + 1
                    return None
                amount *= fx[ccy]
        return amount

    def count(bucket, key):
        quality[bucket][key] = quality[bucket].get(key, 0) + 1

    def tx_rows(table, typed=False):
        smap, tmap = _value_map(table.spec, 'status'), _value_map(table.spec, 'type')
        for row in table.rows:
            kind = None
            if typed:
                raw_type = str(table.get(row, 'type') or '').strip()
                kind = tmap.get(raw_type.lower())
                if kind is None:
                    count('unmapped_type', f'{table.name}: {raw_type}')
                    continue
            pid = norm_id(table.get(row, 'player_id'))
            t = table.time(row)
            if not pid or t is None:
                table.note_bad('time' if pid else 'player_id')
                continue
            amount = money(table, row, parse_amount(table.get(row, 'amount'), table.decimal))
            if table.has('status'):
                raw = str(table.get(row, 'status') or '').strip()
                status = smap.get(raw.lower())
                if status is None:
                    count('unmapped_status', f'{table.name}: {raw}')
                    status = 'other'
            else:
                status = 'success'
            yield kind, pid, t, amount, status, row

    def add_deposit(table, pid, t, amount, status, row):
        # для депозита любая отмена тоже неудачная попытка: игрок хотел внести и не смог; pending не учитываем
        quality['deposit_statuses'][status] = quality['deposit_statuses'].get(status, 0) + 1
        if status == 'cancelled':
            status = 'abandoned'
        if status not in ('success', 'declined', 'abandoned'):
            status = 'other'
        if status == 'success' and amount is None:
            table.note_bad('amount')
            return
        method = str(table.get(row, 'method') or '').strip() if table.has('method') else ''
        country = str(table.get(row, 'country') or '').strip() if table.has('country') else ''
        flag = truthy(table.get(row, 'is_ftd')) if table.has('is_ftd') else None
        decline = None
        if status in ('declined', 'abandoned') and table.has('reason'):
            decline = _value_map(table.spec, 'decline_reasons').get(str(table.get(row, 'reason') or '').strip().lower())
        deposits.append((pid, t, amount or 0.0, status, method, country, flag, decline))

    def add_withdrawal(table, pid, t, amount, status, row):
        # выплачен или в обработке: запрос на вывод; declined: вывод отклонен; abandoned и cancelled: отменен игроком, не считается
        kind = {'declined': 'rejected', 'abandoned': 'cancelled', 'cancelled': 'cancelled', 'pending': 'pending', 'success': 'paid'}.get(status, 'other')
        done = table.time(row, 'done_time') if table.has('done_time') else None
        withdrawals.append((pid, t, amount or 0.0, kind, done))

    if 'transactions' in files:
        tab = Table('transactions', files['transactions'], base)
        tables['transactions'] = tab
        quality['files']['transactions'] = {'paths': tab.paths, 'rows': len(tab.rows), 'latest': tab.latest}
        quality['deposit_status'] = tab.has('status')
        for kind, pid, t, amount, status, row in tx_rows(tab, typed=True):
            if kind == 'deposit':
                add_deposit(tab, pid, t, amount, status, row)
            elif kind == 'withdrawal':
                add_withdrawal(tab, pid, t, amount, status, row)
        quality['bad_values']['transactions'] = tab.bad
    if 'deposits' in files:
        tab = Table('deposits', files['deposits'], base)
        tables['deposits'] = tab
        quality['files']['deposits'] = {'paths': tab.paths, 'rows': len(tab.rows), 'latest': tab.latest}
        quality['deposit_status'] = tab.has('status')
        for _, pid, t, amount, status, row in tx_rows(tab):
            add_deposit(tab, pid, t, amount, status, row)
        quality['bad_values']['deposits'] = tab.bad
    if 'withdrawals' in files:
        tab = Table('withdrawals', files['withdrawals'], base)
        tables['withdrawals'] = tab
        quality['files']['withdrawals'] = {'paths': tab.paths, 'rows': len(tab.rows), 'latest': tab.latest}
        for _, pid, t, amount, status, row in tx_rows(tab):
            add_withdrawal(tab, pid, t, amount, status, row)
        quality['bad_values']['withdrawals'] = tab.bad
    if 'bonuses' in files:
        tab = Table('bonuses', files['bonuses'], base)
        tables['bonuses'] = tab
        quality['files']['bonuses'] = {'paths': tab.paths, 'rows': len(tab.rows), 'latest': tab.latest}
        by_name = {str(k).strip().lower(): float(v) for k, v in (files['bonuses'].get('wager_by_name') or {}).items()}
        bstat = _value_map(files['bonuses'], 'status')
        for row in tab.rows:
            pid = norm_id(tab.get(row, 'player_id'))
            t = tab.time(row)
            if not pid or t is None:
                tab.note_bad('time' if pid else 'player_id')
                continue
            name = str(tab.get(row, 'name') or '').strip() if tab.has('name') else ''
            wager = parse_amount(tab.get(row, 'wager')) if tab.has('wager') else None
            if wager is None and name:
                wager = by_name.get(name.lower())
                if wager is None:
                    hit = re.search(r'(?:^|[^a-zа-я0-9])[xх]\s?(\d{1,3})(?!\d)|(?<!\d)(\d{1,3})\s?[xх](?![a-zа-я])|(?:wager|вейджер|вейджер\w*)\s*(\d{1,3})', name.lower())
                    if hit:
                        wager = float(next(g for g in hit.groups() if g))
            amount = money(tab, row, parse_amount(tab.get(row, 'amount'), tab.decimal)) if tab.has('amount') else None
            status = None
            if tab.has('status'):
                raw = str(tab.get(row, 'status') or '').strip()
                status = bstat.get(raw.lower())
                if status is None and raw:
                    count('unmapped_status', f'bonuses: {raw}')
            bonuses.append((pid, t, wager, name, amount, status))
        quality['bad_values']['bonuses'] = tab.bad
    if 'bets' in files:
        tab = Table('bets', files['bets'], base)
        tables['bets'] = tab
        quality['files']['bets'] = {'paths': tab.paths, 'rows': len(tab.rows), 'latest': tab.latest}
        for row in tab.rows:
            pid = norm_id(tab.get(row, 'player_id'))
            raw_t = tab.get(row, 'time')
            t = tab.time(row)
            b = parse_amount(tab.get(row, 'bets'), tab.decimal)
            if tab.has('wins'):
                w = parse_amount(tab.get(row, 'wins'), tab.decimal)
            elif tab.has('ggr') and b is not None:
                g = parse_amount(tab.get(row, 'ggr'), tab.decimal)
                w = abs(b) - g if g is not None else None
            else:
                w = 0.0
            if not pid or t is None or b is None:
                tab.note_bad('player_id' if not pid else 'time' if t is None else 'bets')
                continue
            b, w = money(tab, row, b), money(tab, row, w or 0.0)
            if b is None:
                continue
            rounds = parse_amount(tab.get(row, 'rounds')) if tab.has('rounds') else None
            end = parse_time(tab.get(row, 'end_time'), tab.dayfirst, tab.tz) if tab.has('end_time') else None
            bets.append((pid, t, has_clock(raw_t), b, w or 0.0, rounds, end))
        quality['bad_values']['bets'] = tab.bad
    if 'players' in files:
        spec = files['players']
        rg_cols = spec.get('rg_flags') or []
        quality['rg_flags'] = bool(rg_cols)
        tab = Table('players', spec, base, extra=rg_cols)
        tables['players'] = tab
        quality['files']['players'] = {'paths': tab.paths, 'rows': len(tab.rows), 'latest': tab.latest}
        for row in tab.rows:
            pid = norm_id(tab.get(row, 'player_id'))
            if not pid:
                continue
            p = players.setdefault(pid, {'reg': None, 'ftd': None, 'country': '', 'source': '', 'rg': [], 'kyc': None})
            if tab.has('reg_time'):
                p['reg'] = tab.time(row, 'reg_time')
            if tab.has('kyc_time'):
                p['kyc'] = tab.time(row, 'kyc_time')
            if tab.has('ftd_time'):
                p['ftd'] = tab.time(row, 'ftd_time')
            if tab.has('country'):
                p['country'] = str(tab.get(row, 'country')).strip()
            if tab.has('source'):
                p['source'] = str(tab.get(row, 'source')).strip()
            p['rg'] += [c for c in rg_cols if truthy(tab.get(row, 'extra:' + c))]
        quality['bad_values']['players'] = tab.bad
    for name in ('transactions', 'withdrawals'):
        if name in tables:
            quality['withdrawal_status'] |= tables[name].has('status')
            quality['withdrawal_done_time'] |= tables[name].has('done_time')
    quality['kyc_time'] = 'players' in tables and tables['players'].has('kyc_time')
    for name, tab in tables.items():
        if tab.tz_seen['explicit'] or tab.tz_seen['naive']:
            quality['tz'][name] = {'explicit': tab.tz_seen['explicit'], 'naive': tab.tz_seen['naive'], 'offset': tab.tz}
    quality['bad_values'] = {k: v for k, v in quality['bad_values'].items() if v}
    # сколько EUR в одной единице валюты отчета: для законных лимитов в евро; None, если курса к EUR нет
    eur = 1.0 if report_ccy == 'EUR' else (1 / fx['EUR'] if fx.get('EUR') else None)
    return {'deposits': deposits, 'withdrawals': withdrawals, 'bonuses': bonuses, 'bets': bets,
            'players': players, 'currency': report_ccy, 'demo': bool(m.get('demo')), 'method_types': m.get('method_types') or {},
            'eur': eur}, quality
