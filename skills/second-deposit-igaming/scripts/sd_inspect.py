"""Безопасный обзор выгрузок перед сопоставлением колонок: python3 sd_inspect.py <папка или файлы>

Печатает названия колонок, предполагаемые типы и агрегаты без исходных значений.
Даже агрегаты, имена файлов/листов/колонок могут быть чувствительными: проверьте вывод локально
перед передачей модели. Малое число вариантов не доказывает анонимность.
"""
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sd_common import RX_DMY, list_sheets, parse_amount, parse_time, read_table  # noqa: E402

EXT = ('.csv', '.tsv', '.txt', '.xlsx', '.xlsm')
MAX_CATEGORIES = 40


def kind_of(name, values):
    vals = [v.strip() for v in values if v.strip()]
    if not vals:
        return 'пусто', {}
    sample = vals[:3000]
    distinct = len(set(vals))
    times = sum(parse_time(v) is not None for v in sample)
    nums = sum(parse_amount(v) is not None and re.fullmatch(r'[-+(]?[\d\s.,]+\)?[^\d]{0,4}|[^\d]{0,4}[\d\s.,]+', v) is not None for v in sample)
    info = {'вариантов': distinct}
    if times / len(sample) > .9 and any(ch in sample[0] for ch in '-./:') and not re.fullmatch(r'\d{1,6}', sample[0]):
        clock = sum(bool(re.search(r'\d{1,2}:\d{2}', v)) and not re.search(r'[ T]00:00(:00)?(\.0+)?$', v) for v in sample)
        info['время суток'] = 'есть' if clock / len(sample) > .5 else 'нет (дневные записи)'
        dmy = [RX_DMY.match(v) for v in sample]
        dmy = [m for m in dmy if m]
        if dmy:
            first_big = any(int(m.group(1)) > 12 for m in dmy)
            second_big = any(int(m.group(2)) > 12 for m in dmy)
            info['порядок'] = ('день первым' if first_big and not second_big else
                               'месяц первым' if second_big and not first_big else 'неоднозначно: уточните dayfirst')
        parsed = sorted(t for t in (parse_time(v) for v in vals) if t)
        return 'дата', info
    idish = re.search(r'(^|[ _.\-])(id|uid|user|player|account|login|email|e-mail|phone|name|ip)([ _.\-]|$)|игрок|клиент|логин|почта|телефон', name.lower())
    if nums / len(sample) > .95:
        if idish or (distinct > .5 * len(vals) and all(re.fullmatch(r'\d{5,}', v) for v in sample[:200])):
            return 'ID (значения скрыты)', info
        info['десятичный разделитель'] = (',' if any(re.search(r',\d{1,2}$', v) for v in sample) and not any(re.search(r'\.\d{1,2}$', v) for v in sample)
                                          else '.')
        amounts = [parse_amount(v) for v in sample]
        amounts = [x for x in amounts if x is not None]
        info['отрицательные'] = 'есть' if any(x < 0 for x in amounts) else 'нет'
        return 'число', info
    if idish:
        return 'ID или персональные данные (значения скрыты)', info
    if distinct <= MAX_CATEGORIES:
        return 'категория', info
    return 'текст (значения скрыты)', info


DOC_SHEETS = {'инструкция', 'колонки', 'інструкція', 'instructions', 'columns', 'readme', 'how to'}


def inspect(path):
    if path.lower().endswith(('.xlsx', '.xlsm')):
        sheets = list_sheets(path)
        if len(sheets) > 1:
            print(f'\n=== {path}\nлисты: {sheets}; лист в mapping.json задается полем "sheet"')
        for sh in sheets:
            if sh.strip().lower() in DOC_SHEETS:
                print(f'\n=== {path} [лист "{sh}"]: описание, не данные, пропущен')
                continue
            header, rows = read_table(path, sh)
            if sum(bool(h) for h in header) < 2:
                print(f'\n=== {path} [лист "{sh}"]: нет таблицы с шапкой в первой строке, пропущен')
                continue
            describe(f'{path} [лист "{sh}"]', header, rows)
        return
    header, rows = read_table(path)
    describe(path, header, rows)


def describe(title, header, rows):
    print(f'\n=== {title}')
    print(f'строк: {len(rows)}, колонок: {len(header)}')
    for i, col in enumerate(header):
        values = [r[i] for r in rows]
        empty = sum(not v.strip() for v in values)
        kind, info = kind_of(col, values)
        extra = '; '.join(f'{k}: {v}' for k, v in info.items())
        print(f'- "{col}": {kind}; пустых {empty * 100 // max(1, len(values))}%; {extra}')


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ('-h', '--help'):
        print(__doc__)
        sys.exit(0 if len(sys.argv) > 1 else 1)
    paths = []
    for arg in sys.argv[1:]:
        if os.path.isdir(arg):
            paths += sorted(os.path.join(arg, f) for f in os.listdir(arg)
                            if f.lower().endswith(EXT) and not f.startswith(('_', '.')) and os.path.isfile(os.path.join(arg, f)))
        else:
            paths.append(arg)
    if not paths:
        print('Не нашел файлов CSV или XLSX')
        sys.exit(1)
    for p in paths:
        try:
            inspect(p)
        except Exception as e:  # файл с битой структурой не должен останавливать обзор остальных
            print(f'\n=== {p}\nне удалось прочитать ({type(e).__name__}); проверьте файл локально')


if __name__ == '__main__':
    main()
