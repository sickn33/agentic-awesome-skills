"""Правила стран: references/geo_rules.json (факты и официальные источники в references/geo_rules.md).

Что из них берет расчет:
  срок выплаты   порог "Долгого вывода" = законный срок страны, если он короче общего порога (Бразилия 2 ч);
                 вывод дольше законного срока отмечается отдельно
  способы оплаты запрещенные в стране типы не подсказываются (кредитные карты в Великобритании и Ирландии)
  лимиты         отказ, который по суммам игрока упирается в законный лимит (Германия 1 000 EUR в месяц),
                 получает действие "объяснить причину", а не "предложить другой способ"
Бенчмарков второго депозита здесь нет: надежных публичных цифр по ним нет ни по одной стране.
"""
import datetime as dt
import json
import os
import re

PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'references', 'geo_rules.json')
TYPES = ('card', 'credit_card', 'instant_bank', 'online_banking', 'ewallet', 'voucher_cash', 'mobile_money', 'crypto')
# тип способа оплаты по названию, если его нет в method_types: только общие слова, первое совпадение
NAME_TYPES = [
    ('credit_card', r'credit|кредит'),
    ('crypto', r'crypto|крипт'),
    ('voucher_cash', r'voucher|cash|ваучер|налич|готівк|efectivo'),
    ('mobile_money', r'mobile money|мобильн\w* деньг|мобільн\w* грош'),
    ('ewallet', r'wallet|кошел|гаман'),
    ('instant_bank', r'instant|мгновен|миттєв'),
    ('online_banking', r'bank|transfer|банк|перевод|переказ'),
    ('card', r'card|debit|карт'),
]
PERIOD_DAYS = {'day': 1, 'week': 7, 'days28': 28}


def load(path=PATH):
    try:
        return json.load(open(path, encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return None


def country_code(rules, raw):
    """Код страны ISO из значения выгрузки: BR, bra, Brazil, Бразилия. Пустая строка, если не узнали."""
    s = re.sub(r'\s+', ' ', str(raw or '').strip()).upper()
    if not s or s == '-':
        return ''
    if re.fullmatch(r'[A-Z]{2}', s):
        return 'GB' if s == 'UK' else s
    return ((rules or {}).get('aliases') or {}).get(s, '')


def rule(rules, code):
    return ((rules or {}).get('countries') or {}).get(code) or {}


def slow_hours(rules, code, default):
    """(порог долгого вывода в часах, законный срок или None): законный срок, если он короче общего порога."""
    legal = rule(rules, code).get('payout_hours')
    return (min(default, legal) if legal else default), legal


def method_type(method_types, name):
    """Тип способа оплаты: из method_types в mapping.json, иначе по общим словам в названии, иначе None."""
    if not name:
        return None
    t = (method_types or {}).get(name)
    if t in TYPES:
        return t
    low = str(name).lower()
    for typ, rx in NAME_TYPES:
        if re.search(rx, low):
            return typ
    return None


def banned(rules, code):
    return set(rule(rules, code).get('banned') or ())


def is_banned(rules, code, mtype):
    """Запрещен ли тип в стране: прямо в списке запретов или не входит в исчерпывающий список разрешенных (Бразилия)."""
    if mtype is None:
        return False
    rl = rule(rules, code)
    return mtype in (rl.get('banned') or ()) or bool(rl.get('allowed')) and mtype not in rl['allowed']


def allowed(rules, code, mtype):
    """Фильтр справочника: неизвестная страна или тип не дают разрешения на рекомендацию."""
    return bool(rule(rules, code)) and mtype in TYPES and not is_banned(rules, code, mtype)


def preferred(rules, code):
    return list(rule(rules, code).get('preferred') or ())


def limit_hit(rules, code, t, amount, deps, wds, mtype, eur):
    """Законный лимит, в который по вашим же данным упирается попытка депозита: (правило, сумма в EUR) или None.

    deps: успешные депозиты игрока [(время, сумма, тип)], wds: выплаченные выводы [(время, сумма)], все до попытки.
    eur: сколько EUR в одной единице валюты отчета; None, если пересчитать нельзя.
    Лимиты на всех операторов (Германия) учитывают только ваши депозиты: если отказ случился раньше, лимит мог
    выбрать другой оператор, и это скрипт не видит."""
    if eur is None:
        return None
    for lim in rule(rules, code).get('limits') or ():
        kind = lim.get('kind')
        if kind not in ('cap', 'net_block'):
            continue
        if lim.get('from') and t < dt.datetime.strptime(lim['from'], '%Y-%m-%d'):
            continue
        types = lim.get('types')
        if types and mtype not in types:
            continue
        if lim.get('period') == 'month':
            inside = lambda x: x.year == t.year and x.month == t.month
        else:
            start = t - dt.timedelta(days=PERIOD_DAYS.get(lim.get('period'), 30))
            inside = lambda x: start <= x < t
        dep = sum(a for x, a, ty in deps if x < t and inside(x) and (not types or ty in types)) * eur
        if kind == 'net_block':
            # Нидерланды: после чистых депозитов больше порога за месяц оператор блокирует депозиты до конца месяца
            net = dep - sum(a for x, a in wds if x < t and inside(x)) * eur
            if net > lim['eur']:
                return lim, net
        elif dep + amount * eur > lim['eur']:
            return lim, dep + amount * eur
    return None


def limit_rules(rules, code):
    return list(rule(rules, code).get('limits') or ())


def sources(rules, ids):
    by_id = (rules or {}).get('sources') or {}
    return [dict(by_id[i], id=i) for i in ids if i in by_id]
