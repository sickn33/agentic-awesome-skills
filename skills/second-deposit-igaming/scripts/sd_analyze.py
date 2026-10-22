"""Почему FTD не делают второй депозит: python3 sd_analyze.py --mapping mapping.json --out <папка> [--lang ru|uk|en]

Два режима, выбираются сами по выгрузке:
  полный   выгрузка за 60-120 дней: причины, недобор вторых депозитов и Sum Dep (вилка от и до) против нормы похожих
           игроков, показатели, срезы, список на сегодня. Сохраняет профиль проекта (profile.json) для ежедневных запусков.
  список   короткая выгрузка за последние дни, где FTD старше окна второго депозита меньше 50: только причины и
           список на сегодня; способы оплаты, история причин и прогноз берутся из сохраненного профиля.
В обоих режимах часть списка уходит в контрольную группу (им не пишут), журнал rescue_log.csv копит результаты,
и когда у игроков из журнала пройдет окно второго депозита, отчет показывает эффект действий против контрольной группы.
Правила стран (references/geo_rules.json): законный срок выплаты, запрещенные способы оплаты, законные лимиты депозитов.

Пишет в --out: report.html, summary.json (только агрегаты), scenarios.csv, segments.csv, rescue_list.csv (игроки для CRM),
excluded_rg.csv, profile.json, rescue_log.csv. В консоль печатает только агрегаты. Определения: references/scenarios.md.
"""
import argparse
import csv
import datetime as dt
import glob
import hashlib
import json
import math
import os
import shutil
import statistics
import sys
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sd_common import MappingError, load_data, load_mapping  # noqa: E402
import sd_geo  # noqa: E402
import sd_report  # noqa: E402
import sd_xlsx  # noqa: E402

# порядок проверки: игрок получает первую сработавшую причину
SCENARIOS = ('persist', 'failed', 'wd_rejected', 'kyc', 'bonus_wd', 'wd_slow', 'withdrew', 'heavy_bonus', 'burned_fast',
             'won_kept', 'balance_left', 'ftd_friction', 'other')
# порядок в списке на сегодня: сначала то, где счет идет на минуты
RESCUE_ORDER = ('persist', 'failed', 'wd_rejected', 'kyc', 'wd_slow', 'burned_fast', 'heavy_bonus', 'balance_left', 'won_kept',
                'withdrew', 'bonus_wd', 'ftd_friction', 'other')
# сервисные случаи: помогаем всегда, в контрольную группу не попадают
SERVICE = {'persist', 'wd_rejected', 'kyc', 'wd_slow_pending', 'wd_slow_paid', 'withdrew_pending', 'deposit_limit'}
FAILED = ('declined', 'abandoned')
HOUR = dt.timedelta(hours=1)
DAY = dt.timedelta(days=1)
PERSIST_N, PERSIST_WINDOW = 3, dt.timedelta(minutes=30)
FRICTION_WINDOW = dt.timedelta(hours=2)
BONUS_BEFORE, BONUS_AFTER = dt.timedelta(minutes=30), 6 * HOUR
LOSS_SHARE, WIN_SHARE = .9, .5
MIN_MATURE = 50
RELIABLE_FTD = 300   # от скольких FTD старше окна цифры профиля надежны; меньше: уже ваши, но шумные
CURVE_HOURS = (6, 12, 24, 48, 72)
LOG_FIELDS = ['player_id', 'ftd_time', 'ftd_amount', 'band', 'reason', 'variant', 'group', 'first_listed', 'second_deposit_at']
# приоритет действия для CRM: 1 сейчас, 2 в течение суток, 3 по цепочке или через 1-3 дня
PRIORITY = {'persist': 1, 'failed': 1, 'deposit_limit': 1, 'wd_rejected': 1, 'kyc': 1, 'wd_slow_pending': 1, 'withdrew_pending': 1,
            'wd_slow_paid': 2, 'burned_fast': 2, 'heavy_bonus': 2, 'heavy_active': 2, 'balance_left': 2,
            'won_kept': 3, 'withdrew_paid': 3, 'bonus_wd': 3, 'ftd_friction': 3, 'other': 3}
LIST_FIELDS = ['player_id', 'group', 'priority', 'reason_code', 'action_code', 'send_after_utc', 'snapshot_utc', 'ftd_time', 'ftd_amount',
               'currency', 'hours_since_ftd', 'reason', 'state', 'when', 'action', 'suggested_method', 'country_rules', 'failed_attempts',
               'failed_method', 'withdrawal_amount', 'bonus', 'country', 'source']
ACTION_FIELDS = ['action_code', 'priority', 'players', 'reason', 'when', 'action', 'file']


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description='Второй депозит: причины, недобор, показатели, список на сегодня')
    ap.add_argument('--mapping', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--lang', default='ru', choices=sorted(sd_report.LANGS))
    ap.add_argument('--as-of', help='момент анализа, по умолчанию последняя попытка депозита в данных (YYYY-MM-DD HH:MM)')
    ap.add_argument('--std-days', type=float, default=7, help='окно второго депозита, дней')
    ap.add_argument('--value-days', type=float, default=30, help='горизонт Sum Dep вернувшегося игрока, дней')
    ap.add_argument('--rescue-hours', type=float, default=72, help='сколько часов после FTD игрок попадает в список')
    ap.add_argument('--heavy-wager', type=float, default=35, help='с какого вейджера бонус считается тяжелым')
    ap.add_argument('--burn-turnover', type=float, default=5, help='сгорел быстро: оборот не больше N сумм внесенного')
    ap.add_argument('--slow-withdrawal-hours', type=float, default=24, help='долгий вывод: дольше N часов от запроса до выплаты')
    ap.add_argument('--warmup-days', type=float, default=30, help='без даты регистрации: первые N дней данных служат историей')
    ap.add_argument('--min-group', type=int, default=30, help='минимум FTD в срезе и в группе для нормы')
    ap.add_argument('--control-share', type=float, default=.2, help='доля контрольной группы в списке (им не пишут), 0 выключает')
    ap.add_argument('--profile', '--baseline', dest='profile', help='профиль проекта из полного запуска, по умолчанию <out>/profile.json')
    ap.add_argument('--country', help='страна игроков, у которых в выгрузке нет страны (код ISO, например BR): для правил стран')
    ap.add_argument('--check', action='store_true', help='только проверить готовность данных: какие причины посчитаются и чего не хватает, без расчета и файлов')
    return ap.parse_args(argv)


def wmean(values, cap_q=.95):
    """Среднее с обрезкой сверху по 95-му перцентилю: один кит не задает сумму для всех."""
    if not values:
        return 0.0
    s = sorted(values)
    cap = s[min(len(s) - 1, int(cap_q * (len(s) - 1) + .5))]
    return sum(min(v, cap) for v in s) / len(s)


def median(values):
    values = [v for v in values if v is not None]
    return statistics.median(values) if values else None


def share(flags):
    flags = list(flags)
    return sum(1 for f in flags if f) / len(flags) if flags else None


def in_control(pid, control_share):
    """Контрольная группа по хешу ID: игрок всегда попадает в одну и ту же группу, хранить ничего не нужно."""
    if control_share <= 0:
        return False
    h = int(hashlib.sha1(f'second-deposit:{pid}'.encode()).hexdigest()[:8], 16)
    return (h % 10000) < control_share * 10000


class Rec:
    __slots__ = ('pid', 'ftd', 'amt', 'method', 'country', 'source', 'second', 'second_amt', 'returned', 'value', 'n30',
                 'failed', 'failed_n', 'persist', 'failed_method', 'pre_fail', 'withdrew', 'wd_amt', 'wd_kind', 'wd_done',
                 'wd_time', 'wd_rej', 'wd_slow', 'wd_hours', 'kyc', 'heavy', 'heavy_status', 'bonus_any', 'bonus_name',
                 'early_turn', 'early_loss', 'early_dep', 'early_rounds', 'turn72', 'net72', 'dep72', 'session_min',
                 'burned', 'balance', 'won_kept', 'scenario', 'band', 'rg', 'hours_since', 'covered', 'first_after_ok',
                 'code', 'slow_h', 'legal_h', 'over_legal', 'slow_by_law', 'fail_kind', 'fail_src', 'fail_sum', 'fail_rule')

    def __init__(self, **kw):
        for k in self.__slots__:
            setattr(self, k, kw.get(k))


def build(data, quality, o, rules=None):
    deposits = sorted(data['deposits'], key=lambda r: r[1])
    if not deposits:
        raise MappingError('в депозитах нет ни одной строки: проверьте mapping.json')
    as_of = o.as_of or max(r[1] for r in deposits)
    data_start = min(r[1] for r in deposits)
    std, vdays = dt.timedelta(days=o.std_days), dt.timedelta(days=o.value_days)
    slow_default = dt.timedelta(hours=o.slow_withdrawal_hours)
    mtypes = data.get('method_types') or {}
    by_player = defaultdict(list)
    for r in deposits:
        if r[1] <= as_of:
            by_player[r[0]].append(r)
    wd = defaultdict(list)
    for p, t, a, kind, done in data['withdrawals']:
        if t <= as_of:
            wd[p].append((t, a, kind, done if done and done <= as_of else None))
    bon = defaultdict(list)
    for p, t, wager, name, amount, status in data['bonuses']:
        bon[p].append((t, wager, name, status))
    bets = defaultdict(list)
    for row in data['bets']:
        if row[1] <= as_of:
            bets[row[0]].append(row)
    for d in (wd, bon):
        for v in d.values():
            v.sort(key=lambda x: x[0])
    for v in bets.values():
        v.sort(key=lambda x: x[1])
    players = data['players']
    has_flag = any(r[6] is not None for r in deposits)
    has_pftd = any(p.get('ftd') for p in players.values())
    has_reg = any(p.get('reg') for p in players.values())
    rule = 'flag' if has_flag else 'player_ftd' if has_pftd else 'reg' if has_reg else 'warmup'
    if rule == 'warmup' and (as_of - data_start) < dt.timedelta(days=o.warmup_days + 1):
        raise MappingError('выгрузка короче 30 дней, а даты первого депозита и даты регистрации нет: нельзя отличить FTD от игроков, '
                           'которые вносили раньше начала выгрузки. Добавьте выгрузку игроков с датой первого депозита (поле ftd_time) '
                           'или датой регистрации (поле reg_time), либо отметку первого депозита в депозитах (поле is_ftd)')
    has_bets = bool(data['bets'])
    bets_from = min((r[1] for r in data['bets']), default=None)
    bets_to = max((r[1] for r in data['bets']), default=None)
    first_day = dt.datetime.combine(data_start.date(), dt.time())
    recs, invalid = [], 0
    for pid, deps in by_player.items():
        succ = [r for r in deps if r[3] == 'success']
        if not succ:
            continue
        if has_flag:
            flagged = [r for r in succ if r[6]]
            if not flagged:
                invalid += 1
                continue
            f = flagged[0]
        else:
            f = succ[0]
            p = players.get(pid)
            if rule == 'player_ftd' and p and p.get('ftd'):
                # дата первого депозита из карточки игрока: FTD в выгрузке, только если он случился в ее пределах
                if p['ftd'] < first_day or abs((f[1] - p['ftd']).total_seconds()) > 86400:
                    invalid += 1
                    continue
            elif rule == 'reg' and p and p.get('reg'):
                if p['reg'] < first_day:
                    invalid += 1
                    continue
            elif f[1] < data_start + dt.timedelta(days=o.warmup_days):
                invalid += 1
                continue
        ftd, amt = f[1], f[2]
        if not amt or amt <= 0:
            continue
        p = players.get(pid, {})
        country = p.get('country') or f[5] or getattr(o, 'country', None) or '-'
        code = sd_geo.country_code(rules, country)
        # порог долгого вывода: законный срок страны, если он короче общего (Бразилия 2 ч)
        slow_h, legal_h = sd_geo.slow_hours(rules, code, o.slow_withdrawal_hours)
        slow = dt.timedelta(hours=slow_h)
        after = [r for r in succ if r[1] > ftd]
        second = after[0][1] if after else None
        returned = second is not None and second <= ftd + std
        in30 = [r for r in after if r[1] <= ftd + vdays]
        stop = min(second or as_of, ftd + std, as_of)
        # касса: неудачные попытки после FTD до второго депозита и перед FTD
        attempts = [r for r in deps if ftd < r[1] <= ftd + std and r[3] in ('success',) + FAILED]
        fails = [r for r in deps if ftd < r[1] <= stop and r[3] in FAILED and (second is None or r[1] < second)]
        persist = any(sum(1 for y in fails if x[1] <= y[1] <= x[1] + PERSIST_WINDOW) >= PERSIST_N for x in fails)
        pre_fail = any(ftd - FRICTION_WINDOW <= r[1] < ftd and r[3] in FAILED for r in deps)
        # выводы до второго депозита: выплачен или в обработке, отклонен, долгий
        wds = [x for x in wd.get(pid, []) if ftd < x[0] <= stop and (second is None or x[0] < second)]
        w_ok = [x for x in wds if x[2] in ('paid', 'pending')]
        w_rej = [x for x in wds if x[2] == 'rejected']
        hours = [(x[3] - x[0]).total_seconds() / 3600 for x in w_ok if x[3]]
        late = lambda lim: any((x[3] and x[3] - x[0] > lim) or (x[2] == 'pending' and not x[3] and as_of - x[0] > lim) for x in w_ok)
        w_slow = late(slow)
        over_legal = bool(legal_h) and late(dt.timedelta(hours=legal_h))
        last_ok = w_ok[-1] if w_ok else None
        # отказ по лимиту или блокировке: по причине отказа из выгрузки, иначе по суммам игрока и законным лимитам страны
        fail_kind = fail_src = fail_sum = fail_rule = None
        kinds = {x[7] for x in fails if len(x) > 7 and x[7]}
        if kinds:
            fail_kind, fail_src = ('block' if 'block' in kinds else 'limit'), 'reason'
        elif fails and sd_geo.limit_rules(rules, code):
            prev = [(x[1], x[2], sd_geo.method_type(mtypes, x[4])) for x in succ]
            paid = [(x[0], x[1]) for x in wd.get(pid, []) if x[2] == 'paid']
            for x in reversed(fails):
                hit = sd_geo.limit_hit(rules, code, x[1], x[2], prev, paid, sd_geo.method_type(mtypes, x[4]), data.get('eur'))
                if hit:
                    fail_kind, fail_src, fail_rule, fail_sum = 'limit', 'amount', hit[0], hit[1]
                    break
        rg = list(p.get('rg') or [])
        if fail_kind == 'block':
            rg.append('bank_block')  # игрок сам заблокировал гемблинг в банке: как флаг ответственной игры
        # бонус к FTD и проверка документов
        bw = [x for x in bon.get(pid, []) if ftd - BONUS_BEFORE <= x[0] <= ftd + BONUS_AFTER]
        heavy = [x for x in bw if x[1] is not None and x[1] >= o.heavy_wager]
        kyc_t = p.get('kyc')
        kyc = bool(kyc_t and ftd <= kyc_t <= stop and (second is None or kyc_t < second))
        # игра: первая сессия (24 часа или день FTD и следующий) и 72 часа (или день FTD и три следующих)
        rows = bets.get(pid, [])
        e_turn = e_loss = e_rounds = t72 = n72 = 0.0
        session = None
        covered = has_bets and bets_from is not None and bets_from.date() <= ftd.date() <= bets_to.date()
        e_end_clock, e_end_day = ftd + DAY, dt.datetime.combine(ftd.date() + dt.timedelta(days=2), dt.time())
        w_end_clock, w_end_day = ftd + 3 * DAY, dt.datetime.combine(ftd.date() + dt.timedelta(days=4), dt.time())
        any_daily = False
        for _, t, clock, b, win, rounds, end in rows:
            if clock:
                if t < ftd - dt.timedelta(minutes=5):
                    continue
                if t < e_end_clock:
                    e_turn += b
                    e_loss += b - win
                    e_rounds += rounds or 0
                    if session is None and end is not None:
                        session = max(0.0, (end - t).total_seconds() / 60)
                if t < w_end_clock:
                    t72 += b
                    n72 += win - b
            else:
                if t.date() < ftd.date():
                    continue
                any_daily = True
                if t < e_end_day:
                    e_turn += b
                    e_loss += b - win
                    e_rounds += rounds or 0
                if t < w_end_day:
                    t72 += b
                    n72 += win - b
        e_limit = e_end_day if any_daily else e_end_clock
        w_limit = w_end_day if any_daily else w_end_clock
        e_dep = amt + sum(r[2] for r in after if r[1] < e_limit)
        d72 = amt + sum(r[2] for r in after if r[1] < w_limit)
        burned = balance = won_kept = None
        if covered:
            burned = e_turn > 0 and e_loss >= LOSS_SHARE * e_dep and e_turn <= o.burn_turnover * e_dep
            matured = (as_of - ftd) >= DAY
            won_kept = n72 >= WIN_SHARE * d72 and not w_ok and matured
            balance = t72 < d72 and not w_ok and matured
        checks = (('persist', persist), ('failed', fails), ('wd_rejected', w_rej), ('kyc', kyc), ('bonus_wd', bw and w_ok),
                  ('wd_slow', w_slow), ('withdrew', w_ok), ('heavy_bonus', heavy), ('burned_fast', burned),
                  ('won_kept', won_kept), ('balance_left', balance), ('ftd_friction', pre_fail))
        sc = next((k for k, v in checks if v), 'other')
        first_after = attempts[0] if attempts else None
        recs.append(Rec(pid=pid, ftd=ftd, amt=amt, method=f[4] or '-', country=country,
                        source=p.get('source') or '-', second=second, second_amt=after[0][2] if after else None,
                        returned=returned, value=sum(r[2] for r in in30), n30=len(in30), failed=bool(fails),
                        failed_n=len(fails), persist=persist, failed_method=fails[-1][4] if fails else '', pre_fail=pre_fail,
                        withdrew=bool(w_ok), wd_amt=sum(x[1] for x in w_ok), wd_kind=last_ok[2] if last_ok else None,
                        wd_done=last_ok[3] if last_ok else None, wd_time=last_ok[0] if last_ok else None, wd_rej=bool(w_rej),
                        wd_slow=w_slow, wd_hours=median(hours), kyc=kyc, heavy=bool(heavy),
                        heavy_status=heavy[0][3] if heavy else None, bonus_any=bool(bw),
                        bonus_name=(heavy or bw)[0][2] if bw else '', early_turn=e_turn, early_loss=e_loss, early_dep=e_dep,
                        early_rounds=e_rounds, turn72=t72, net72=n72, dep72=d72, session_min=session, burned=burned,
                        balance=balance, won_kept=won_kept, scenario=sc, rg=rg,
                        hours_since=(as_of - ftd).total_seconds() / 3600, covered=covered,
                        first_after_ok=(first_after[3] == 'success') if first_after else None,
                        code=code, slow_h=slow_h, legal_h=legal_h, over_legal=over_legal,
                        slow_by_law=w_slow and not late(slow_default), fail_kind=fail_kind, fail_src=fail_src,
                        fail_sum=fail_sum, fail_rule=fail_rule))
    failed_known = quality.get('deposit_status', True) and any(r[3] in FAILED for r in deposits)
    avail = {
        'persist': failed_known,
        'failed': failed_known,
        'wd_rejected': bool(data['withdrawals']) and quality.get('withdrawal_status', False),
        'kyc': quality.get('kyc_time', False),
        'bonus_wd': bool(data['bonuses']) and bool(data['withdrawals']),
        'wd_slow': bool(data['withdrawals']) and (quality.get('withdrawal_done_time', False) or any(x[3] == 'pending' for x in data['withdrawals'])),
        'withdrew': bool(data['withdrawals']),
        'heavy_bonus': bool(data['bonuses']),
        'burned_fast': has_bets,
        'won_kept': has_bets,
        'balance_left': has_bets,
        'ftd_friction': failed_known,
    }
    return recs, {'as_of': as_of, 'data_start': data_start, 'rule': rule, 'invalid': invalid, 'avail': avail,
                  'bets_from': bets_from, 'bets_to': bets_to, 'by_player': by_player}


def approval_table(deposits, players, min_n):
    """Доля успешных попыток по стране и способу оплаты (страна из депозита или из карточки игрока)."""
    stat = defaultdict(lambda: [0, 0])
    for pid, t, amount, status, method, country, *_ in deposits:
        if status in ('success',) + FAILED and method:
            country = country or players.get(pid, {}).get('country') or '*'
            for key in {(country, method), ('*', method)}:
                stat[key][0] += 1
                stat[key][1] += status == 'success'
    return {k: (n, ok / n) for k, (n, ok) in stat.items() if n >= min_n}


def suggest_method(appr, rules, r, mtypes, methods_seen):
    """Способ оплаты после отказа: лучший по апруву в стране игрока, потом основной для страны тип из правил стран,
    потом лучший по всем странам. Не предлагаются способ, где был отказ, и типы, запрещенные в стране игрока.
    Третье значение: лучший по апруву вариант был запрещен в стране и пропущен."""
    avoid = r.failed_method or r.method
    ok = lambda m: sd_geo.allowed(rules, r.code, sd_geo.method_type(mtypes, m))
    skipped = False

    def best(c):
        nonlocal skipped
        options = sorted(((rate, n, m) for (cc, m), (n, rate) in appr.items() if cc == c and m != avoid), reverse=True)
        if options and not ok(options[0][2]):
            skipped = True
        return next(((m, rate) for rate, n, m in options if ok(m)), None)
    hit = best(r.country)
    if not hit:
        hit = next(((m, None) for t in sd_geo.preferred(rules, r.code) for m in methods_seen
                    if m != avoid and sd_geo.method_type(mtypes, m) == t), None)
    if not hit:
        hit = best('*')
    return (hit or ('', None)) + (skipped,)


def bonus_names(bonuses, heavy):
    """Как распознаны бонусы: название, вейджер, тяжелый ли. Без игроков, для проверки сопоставления."""
    c = Counter((name or '-', wager) for _, _, wager, name, _, _ in bonuses)
    return [{'name': n, 'wager': w, 'heavy': w is not None and w >= heavy, 'count': k} for (n, w), k in c.most_common(20)]


def action_variant(r):
    """Действие по фактическому состоянию: вывод в обработке или выплачен, бонус еще отыгрывается или нет."""
    s = r.scenario
    if s in ('failed', 'persist') and r.fail_kind == 'limit':
        return 'deposit_limit'
    if s in ('withdrew', 'wd_slow'):
        return f'{s}_pending' if r.wd_kind == 'pending' else f'{s}_paid'
    if s == 'heavy_bonus':
        return 'heavy_active' if r.heavy_status == 'active' else 'heavy_bonus'
    return s


def norm_model(others, min_n, fallback):
    """Норма похожих игроков: доля вторых депозитов у FTD без сигналов с тем же размером FTD, источником и страной.
    Если такая группа меньше min_n, берется размер FTD и источник, потом только размер FTD, потом общая норма."""
    stats = {lvl: defaultdict(lambda: [0, 0]) for lvl in (1, 2, 3)}
    for r in others:
        for lvl, key in ((1, (r.band,)), (2, (r.band, r.source)), (3, (r.band, r.source, r.country))):
            stats[lvl][key][0] += 1
            stats[lvl][key][1] += r.returned
    used = Counter()

    def norm_for(r):
        for lvl, key in ((3, (r.band, r.source, r.country)), (2, (r.band, r.source)), (1, (r.band,))):
            n, ret = stats[lvl].get(key, (0, 0))
            if n >= min_n:
                used[lvl] += 1
                return ret / n
        used[0] += 1
        return fallback
    return norm_for, used


def metrics(mature, vmature, data, avail):
    """Показатели второго депозита, денег, кассы, выводов, бонусов и игры. Подписи и определения: sd_report, ключ metric."""
    m = {'ftd': len(mature)}
    for key, hrs in (('std_24h', 24), ('std_72h', 72)):
        m[key] = share(r.second is not None and r.second <= r.ftd + dt.timedelta(hours=hrs) for r in mature)
    m['std_7d'] = share(r.returned for r in mature)
    m30 = [r for r in mature if r.hours_since >= 30 * 24]
    if len(m30) >= 30:
        m['std_30d'] = share(r.second is not None and r.second <= r.ftd + dt.timedelta(days=30) for r in m30)
    rets = [r for r in mature if r.returned]
    m['hours_to_std'] = median([(r.second - r.ftd).total_seconds() / 3600 for r in rets])
    m['second_to_ftd'] = median([r.second_amt / r.amt for r in rets if r.second_amt])
    if vmature:
        m['sumdep_per_ftd'] = wmean([r.value for r in vmature])
        m['sumdep_per_returner'] = wmean([r.value for r in vmature if r.returned])
        m['deposits_per_returner'] = median([r.n30 for r in vmature if r.returned])
    if avail['failed']:
        st = Counter(r[3] for r in data['deposits'])
        tried = st['success'] + st['declined'] + st['abandoned']
        m['approval_all'] = st['success'] / tried if tried else None
        firsts = [r.first_after_ok for r in mature if r.first_after_ok is not None]
        m['approval_second'] = share(firsts) if firsts else None
        m['ftd_friction_share'] = share(r.pre_fail for r in mature)
        m['failed_second_share'] = share(r.failed for r in mature)
    if avail['withdrew']:
        m['withdraw_before_share'] = share(r.withdrew for r in mature)
        kinds = Counter(x[3] for x in data['withdrawals'])
        req = kinds['paid'] + kinds['pending'] + kinds['rejected']
        if avail['wd_rejected'] and req:
            m['withdraw_rejected_rate'] = kinds['rejected'] / req
        hrs = [r.wd_hours for r in mature if r.wd_hours is not None]
        if hrs:
            m['withdraw_hours'] = median(hrs)
        if avail['wd_slow']:
            m['withdraw_slow_share'] = share(r.wd_slow for r in mature if r.withdrew)
    if avail['heavy_bonus']:
        m['bonus_share'] = share(r.bonus_any for r in mature)
        m['heavy_share'] = share(r.heavy for r in mature)
    if avail['kyc']:
        m['kyc_share'] = share(r.kyc for r in mature)
    cov = [r for r in mature if r.covered]
    if cov:
        m['no_bets_share'] = share(r.turn72 == 0 for r in cov)
        played = [r for r in cov if r.early_dep and r.early_turn]
        m['turnover_x'] = median([r.early_turn / r.early_dep for r in played])
        m['loss_share'] = median([r.early_loss / r.early_dep for r in played])
    return {k: v for k, v in m.items() if v is not None}


def weekly(mature):
    """Доля вторых депозитов по неделям FTD: последние 8 недель, где не меньше 20 FTD."""
    weeks = defaultdict(list)
    for r in mature:
        monday = (r.ftd - dt.timedelta(days=r.ftd.weekday())).date()
        weeks[monday].append(r.returned)
    rows = [{'week': w.isoformat(), 'n': len(v), 'rate': sum(v) / len(v)} for w, v in sorted(weeks.items()) if len(v) >= 20]
    return rows[-8:]


def curve(group, hours):
    """Доля вернувшихся к каждому часу после FTD: по ней видно, как быстро игроки делают второй депозит."""
    if not group:
        return None
    return [sum(1 for r in group if r.second is not None and r.second <= r.ftd + dt.timedelta(hours=h)) / len(group) for h in hours]


def cond_return(cv, hours, h):
    """Шанс второго депозита до конца окна у того, кто не вернулся за h часов: (F(конец) - F(h)) / (1 - F(h))."""
    if not cv or h >= hours[-1]:
        return 0.0
    pts = [(0.0, 0.0)] + list(zip(hours, cv))
    fh = cv[-1]
    for (h0, f0), (h1, f1) in zip(pts, pts[1:]):
        if h <= h1:
            fh = f0 + (f1 - f0) * (h - h0) / (h1 - h0)
            break
    return max(0.0, (cv[-1] - fh) / (1 - fh)) if fh < 1 else 0.0


def geo_mix(recs):
    """Доли стран среди FTD."""
    c = Counter(r.country for r in recs if r.country and r.country != '-')
    total = sum(c.values())
    return {k: v / total for k, v in c.most_common(15)} if total else {}


def forecast(rescue, profile, std_hours):
    """Прогноз по списку на сегодня из профиля: сколько вернутся без действий и сколько не хватает до нормы."""
    curves = (profile or {}).get('curves') or {}
    if 'norm' not in curves or 'all' not in curves:
        return None
    hours = profile['curve_hours']
    exp_ = gap = 0.0
    for r, *_ in rescue:
        cv = curves.get(r.scenario) or curves['all']
        pr = cond_return(cv, hours, r.hours_since)
        pn = cond_return(curves['norm'], hours, r.hours_since)
        exp_ += pr
        gap += max(0.0, pn - pr)
    red = profile.get('redeposit') or {}
    return {'listed': len(rescue), 'expected_returns': exp_, 'gap': gap,
            'money_min': gap * (red.get('second_deposit') or 0), 'money_max': gap * (red.get('sumdep_per_returner') or 0)}


def make_bands(amounts):
    amounts = sorted(amounts)
    qs = sorted(set(amounts[int(q * (len(amounts) - 1))] for q in (.25, .5, .75)))
    return [c for c in qs if c < amounts[-1]]


def band_of(cuts, a):
    for i, c in enumerate(cuts):
        if a <= c:
            return i
    return len(cuts)


def full_analysis(recs, meta, data, quality, o):
    as_of = meta['as_of']
    std = dt.timedelta(days=o.std_days)
    caveats = []
    rg_all = [r for r in recs if r.rg]
    pool = [r for r in recs if not r.rg]
    mature = [r for r in pool if r.ftd <= as_of - std]
    if len(mature) < 300:
        caveats.append('small_sample')
    vmature = [r for r in mature if r.ftd <= as_of - dt.timedelta(days=o.value_days)]
    value_days = o.value_days
    if sum(r.returned for r in vmature) < 30:
        value_days = o.std_days
        for r in mature:
            r.value = sum(x[2] for x in meta['by_player'][r.pid] if x[3] == 'success' and r.ftd < x[1] <= r.ftd + std)
        vmature = mature
        caveats.append('short_value_horizon')
    common_caveats(meta, quality, caveats)
    cuts = make_bands([r.amt for r in mature])
    for r in recs:
        r.band = band_of(cuts, r.amt)
    nb = len(cuts) + 1
    bands = [((cuts[i - 1] if i else None), (cuts[i] if i < len(cuts) else None)) for i in range(nb)]

    def rate_by_band(group, fallback):
        out = []
        for b in range(nb):
            g = [r for r in group if r.band == b]
            out.append(sum(r.returned for r in g) / len(g) if len(g) >= o.min_group else fallback)
        return out
    overall_rate = sum(r.returned for r in mature) / len(mature)
    others = [r for r in mature if r.scenario == 'other']
    norm_overall = sum(r.returned for r in others) / len(others) if others else overall_rate
    norm_for, norm_used = norm_model(others, o.min_group, norm_overall)
    base = rate_by_band(mature, overall_rate)
    v_all = wmean([r.value for r in vmature if r.returned])
    s_all = median([r.second_amt for r in mature if r.returned]) or 0.0
    value_b, second_b = [], []
    for b in range(nb):
        vb = [r.value for r in vmature if r.returned and r.band == b]
        value_b.append(wmean(vb) if len(vb) >= 20 else v_all)
        sb = [r.second_amt for r in mature if r.returned and r.band == b]
        second_b.append(median(sb) if len(sb) >= 20 else s_all)
    span = max(1.0, (max(r.ftd for r in mature) - min(r.ftd for r in mature)).total_seconds() / 86400)
    per_month = 30.0 / span

    def gap(group, ref):
        """Ожидаемые и фактические вторые депозиты, недобор, недобор в деньгах (от и до) и z: насколько разрыв больше случайного."""
        ps = [ref(r) for r in group]
        expected = sum(ps)
        var = sum(p * (1 - p) for p in ps)
        actual = sum(r.returned for r in group)
        g = max(0.0, expected - actual)
        v_max = sum(p * value_b[r.band] for p, r in zip(ps, group)) / expected if expected else 0.0
        v_min = sum(p * second_b[r.band] for p, r in zip(ps, group)) / expected if expected else 0.0
        z = (expected - actual) / math.sqrt(var) if var > 0 else 0.0
        return expected, actual, g, g * v_min, g * v_max, z

    scen = []
    for s in SCENARIOS:
        g = [r for r in mature if r.scenario == s]
        n = len(g)
        if s == 'other':
            exp_, act, gp, lmin, lmax, z = sum(norm_for(r) for r in g), sum(r.returned for r in g), 0.0, 0.0, 0.0, 0.0
        else:
            exp_, act, gp, lmin, lmax, z = gap(g, norm_for)
        scen.append({'key': s, 'n': n, 'share': n / len(mature), 'returned': act, 'rate': act / n if n else 0.0,
                     'expected_rate': exp_ / n if n else 0.0, 'gap_players_total': gp, 'gap_players_month': gp * per_month,
                     'lost_total': lmax, 'lost_month': lmax * per_month, 'lost_month_min': lmin * per_month, 'z': z,
                     'available': meta['avail'].get(s, True), 'stats': scenario_stats(s, g)})
    # срезы: сравнение с игроками с тем же размером FTD, в отчет только разрывы больше случайных (z от 2)
    dims = [('method', lambda r: r.method), ('country', lambda r: r.country), ('source', lambda r: r.source),
            ('hour', lambda r: r.ftd.hour // 6)]
    if meta['avail']['heavy_bonus']:
        dims.append(('bonus', lambda r: int(r.bonus_any)))
    segs = []
    for dim, key in dims:
        groups = defaultdict(list)
        for r in mature:
            groups[key(r)].append(r)
        if len(groups) < 2:
            continue
        for k, g in groups.items():
            if len(g) < o.min_group or k in ('-', ''):
                continue
            exp_, act, gp, lmin, lmax, z = gap(g, lambda r: base[r.band])
            segs.append({'dim': dim, 'group': k, 'n': len(g), 'rate': act / len(g), 'expected_rate': exp_ / len(g),
                         'gap_players_month': gp * per_month, 'lost_month': lmax * per_month, 'lost_month_min': lmin * per_month,
                         'z': z, 'significant': z >= 2})
    segs.sort(key=lambda x: -x['lost_month'])
    worst = [x for x in segs if x['lost_month'] > 0 and x['z'] >= 2][:8]
    appr = approval_table(data['deposits'], data['players'], o.min_group)
    hours = [(r.second - r.ftd).total_seconds() / 3600 for r in mature if r.returned]
    mt = metrics(mature, vmature, data, meta['avail'])
    ch = list(CURVE_HOURS) + [o.std_days * 24]
    curves = {'all': curve(mature, ch), 'norm': curve(others, ch)}
    for x in scen:
        g = [r for r in mature if r.scenario == x['key']]
        if len(g) >= o.min_group:
            curves[x['key']] = curve(g, ch)
    baseline = {
        'version': 2, 'source': 'history',
        'created': as_of.strftime('%Y-%m-%d %H:%M'), 'cohort_from': min(r.ftd for r in mature).strftime('%Y-%m-%d'),
        'cohort_to': max(r.ftd for r in mature).strftime('%Y-%m-%d'), 'ftd': len(mature), 'currency': data['currency'],
        'geo': geo_mix(mature),
        'std': {k: mt.get(k) for k in ('std_24h', 'std_72h', 'std_7d', 'std_30d')}, 'std_rate': overall_rate, 'norm_rate': norm_overall,
        'curve_hours': ch, 'curves': curves,
        'redeposit': {'second_deposit': s_all, 'second_to_ftd': mt.get('second_to_ftd'), 'hours_to_std': mt.get('hours_to_std'),
                      'deposits_per_returner': mt.get('deposits_per_returner'), 'sumdep_per_returner': v_all,
                      'sumdep_per_ftd': mt.get('sumdep_per_ftd')},
        'cuts': cuts, 'value_band': value_b, 'second_band': second_b,
        'approval': [[c, m, n, rate] for (c, m), (n, rate) in appr.items()],
        'approval_all': mt.get('approval_all'), 'payout_hours': mt.get('withdraw_hours'),
        'scenarios': {x['key']: {'n': x['n'], 'rate': x['rate'], 'expected_rate': x['expected_rate']} for x in scen},
        'value_per_returner': v_all, 'second_deposit': s_all,
    }
    summary = {
        'mode': 'full',
        'cohort_from': baseline['cohort_from'], 'cohort_to': baseline['cohort_to'], 'cohort_days': round(span),
        'params_value_days': value_days,
        'ftd_rule': meta['rule'], 'ftd_skipped_history': meta['invalid'], 'rg_excluded_ftd': len(rg_all),
        'norm_levels': {'ftd_source_country': norm_used[3], 'ftd_source': norm_used[2], 'ftd': norm_used[1], 'overall': norm_used[0]},
        'overall': {'ftd': len(mature), 'ftd_month': len(mature) * per_month, 'returned': sum(r.returned for r in mature),
                    'std_rate': overall_rate, 'norm_rate': norm_overall, 'median_hours_to_std': median(hours),
                    'value_per_returner': v_all, 'second_deposit': s_all,
                    'lost_month': sum(x['lost_month'] for x in scen), 'lost_month_min': sum(x['lost_month_min'] for x in scen),
                    'gap_players_month': sum(x['gap_players_month'] for x in scen)},
        'metrics': mt,
        'weekly': weekly(mature),
        'bands': [{'lo': lo, 'hi': hi, 'value': value_b[i], 'second': second_b[i]} for i, (lo, hi) in enumerate(bands)],
        'scenarios': scen,
        'segments': worst,
        'caveats': caveats,
    }
    return summary, segs, appr, baseline


def scenario_stats(s, g):
    st = {}
    if not g:
        return st
    st['median_ftd'] = median([r.amt for r in g])
    if s == 'burned_fast':
        st['turnover_x'] = median([r.early_turn / r.early_dep for r in g if r.early_dep])
        st['loss_share'] = median([r.early_loss / r.early_dep for r in g if r.early_dep])
        rb = [r.early_turn / r.early_rounds / r.amt for r in g if r.early_rounds]
        if rb:
            st['bet_share'] = median(rb)
        sm = [r.session_min for r in g if r.session_min is not None]
        if sm:
            st['session_min'] = median(sm)
    if s in ('failed', 'persist'):
        st['attempts'] = median([r.failed_n for r in g])
        st['methods'] = dict(Counter(r.failed_method for r in g).most_common(3))
        lim = share(r.fail_kind == 'limit' for r in g)
        if lim:
            st['limit_share'] = lim
    if s in ('withdrew', 'wd_slow', 'bonus_wd'):
        st['withdrawal_x'] = median([r.wd_amt / r.amt for r in g if r.amt])
        hrs = [r.wd_hours for r in g if r.wd_hours is not None]
        if hrs:
            st['withdraw_hours'] = median(hrs)
    if s == 'won_kept':
        st['win_x'] = median([r.net72 / r.dep72 for r in g if r.dep72])
    if s in ('heavy_bonus', 'bonus_wd'):
        st['bonuses'] = dict(Counter(r.bonus_name for r in g).most_common(3))
    return st


def common_caveats(meta, quality, caveats):
    if meta['rule'] == 'warmup':
        caveats.append('warmup')
    if quality['missing_fx']:
        caveats.append('missing_fx')
    tz = quality.get('tz', {})
    if any(v['explicit'] for v in tz.values()) and any(v['naive'] and v['offset'] is None for v in tz.values()):
        caveats.append('mixed_tz')
    for k in ('failed', 'withdrew', 'heavy_bonus', 'burned_fast', 'wd_rejected', 'wd_slow', 'kyc'):
        if not meta['avail'][k]:
            caveats.append('no_' + k)


def geo_notes(rules, r, variant):
    """Правила страны игрока, которые меняют действие: при отказе в кассе способы оплаты и лимиты, при выводе срок
    выплаты и условия вывода. Тексты собирает sd_report.geo_note_text."""
    rl = sd_geo.rule(rules, r.code)
    c, notes = r.code, []
    if not rl:
        return notes
    if r.scenario in ('failed', 'persist'):
        if rl.get('allowed'):
            notes.append(('allowed', {'c': c, 'types': rl['allowed'], 'banned': rl.get('banned', [])}))
        elif rl.get('banned'):
            notes.append(('banned', {'c': c, 'types': rl['banned']}))
        if rl.get('own_name'):
            notes.append(('own_name', {'c': c}))
        if rl.get('single_method'):
            notes.append(('single_method', {'c': c}))
        if rl.get('limits') and variant != 'deposit_limit':
            notes.append(('limits', {'c': c, 'limits': rl['limits']}))
        if rl.get('bank_blocks'):
            notes.append(('bank_blocks', {'c': c}))
    elif r.scenario in ('wd_slow', 'withdrew', 'bonus_wd', 'wd_rejected'):
        if rl.get('payout_hours') and r.scenario != 'wd_rejected':
            notes.append(('payout', {'c': c, 'h': rl['payout_hours'], 'over': bool(r.over_legal)}))
        if rl.get('withdraw_conditions'):
            notes.append(('withdraw', dict(rl['withdraw_conditions'], c=c)))
    return notes


def build_rescue(recs, as_of, o, appr, rules=None, mtypes=None):
    """Список на сегодня: свежие FTD без второго депозита, действие по состоянию, правила страны, контрольная группа."""
    methods_seen = sorted({r.method for r in recs if r.method and r.method != '-'} | {m for (_, m) in appr})
    in_window = [r for r in recs if r.hours_since <= o.rescue_hours]
    window = [r for r in in_window if r.second is None]
    excluded = [r for r in window if r.rg]
    rescue, skipped = [], 0
    for r in window:
        if r.rg:
            continue
        variant = action_variant(r)
        sugg, sugg_rate = '', None
        if r.scenario in ('failed', 'persist') and variant != 'deposit_limit':
            sugg, sugg_rate, banned_best = suggest_method(appr, rules, r, mtypes or {}, methods_seen)
            skipped += banned_best
        group = 'control' if variant not in SERVICE and in_control(r.pid, o.control_share) else 'contact'
        rescue.append((r, variant, sugg, sugg_rate, group, geo_notes(rules, r, variant)))
    order = {k: i for i, k in enumerate(RESCUE_ORDER)}
    rescue.sort(key=lambda x: (x[4] == 'control', PRIORITY.get(x[1], 3), order[x[0].scenario], -x[0].amt))
    info = {'total': len(rescue), 'contact': sum(x[4] == 'contact' for x in rescue), 'control': sum(x[4] == 'control' for x in rescue),
            'by_scenario': dict(Counter(x[0].scenario for x in rescue)), 'excluded_rg': len(excluded), 'ftd_in_window': len(in_window),
            'with_second_deposit': sum(r.second is not None for r in in_window), 'snapshot': as_of.strftime('%Y-%m-%d %H:%M'),
            'ftd_amount_sum': sum(x[0].amt for x in rescue), 'deposit_limit': sum(x[1] == 'deposit_limit' for x in rescue),
            'banned_skipped': skipped, 'with_geo_note': sum(bool(x[5]) for x in rescue)}
    return rescue, excluded, info


def geo_summary(rules, recs, data, o, info):
    """Какие правила стран применены: страны игроков из выгрузки с правилами, страны без правил и счетчики того,
    что правила изменили в расчете и в списке."""
    if not rules:
        return None
    ftd = Counter(r.code or r.country for r in recs if r.country and r.country != '-')
    total = sum(ftd.values()) or 1
    countries, no_rules = [], []
    for key, n in ftd.most_common():
        rl = sd_geo.rule(rules, key)
        if not rl:
            if n / total >= .01:
                no_rules.append(key)
            continue
        row = {'code': key, 'ftd': n, 'share': n / total, 'slow_h': sd_geo.slow_hours(rules, key, o.slow_withdrawal_hours)[0]}
        row.update({k: v for k, v in rl.items()})
        countries.append(row)
    mtypes = data.get('method_types') or {}
    banned_seen = defaultdict(Counter)
    players = data['players']
    for pid, t, amount, status, method, country, *_ in data['deposits']:
        if status not in ('success',) + FAILED or not method:
            continue
        code = sd_geo.country_code(rules, country or players.get(pid, {}).get('country') or o.country)
        mtype = sd_geo.method_type(mtypes, method)
        if sd_geo.is_banned(rules, code, mtype):
            banned_seen[code][mtype] += 1
    pool = [r for r in recs if not r.rg]
    applied = {
        'limit_reason': sum(r.fail_kind == 'limit' and r.fail_src == 'reason' for r in pool),
        'limit_amount': sum(r.fail_kind == 'limit' and r.fail_src == 'amount' for r in pool),
        'bank_block': sum('bank_block' in r.rg for r in recs),
        'slow_by_law': sum(r.scenario == 'wd_slow' and bool(r.slow_by_law) for r in pool),
        'over_legal': sum(bool(r.over_legal) for r in pool),
        'banned_skipped': info.get('banned_skipped', 0),
        'with_geo_note': info.get('with_geo_note', 0),
    }
    return {'countries': countries, 'no_rules': no_rules, 'applied': applied,
            'banned_in_data': {c: dict(v) for c, v in banned_seen.items()}, 'eur': data.get('eur') is not None,
            'default_slow_h': o.slow_withdrawal_hours, 'version': rules.get('version')}


def update_log(path, rescue, data, as_of, o):
    """Журнал списка: новые игроки дописываются, у старых отмечается второй депозит, как только он появится в выгрузке."""
    rows = {}
    if os.path.exists(path):
        with open(path, newline='', encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                rows[row['player_id']] = row
    for r, variant, _, _, group, _ in rescue:
        if r.pid not in rows:
            rows[r.pid] = {'player_id': r.pid, 'ftd_time': r.ftd.strftime('%Y-%m-%d %H:%M:%S'), 'ftd_amount': f'{r.amt:.2f}',
                           'band': '', 'reason': r.scenario, 'variant': variant, 'group': group,
                           'first_listed': as_of.strftime('%Y-%m-%d %H:%M'), 'second_deposit_at': ''}
    std = dt.timedelta(days=o.std_days)
    succ = defaultdict(list)
    for pid, t, amount, status, *_ in data['deposits']:
        if status == 'success' and t <= as_of and pid in rows:
            succ[pid].append(t)
    for pid, row in rows.items():
        if row['second_deposit_at']:
            continue
        ftd = dt.datetime.strptime(row['ftd_time'], '%Y-%m-%d %H:%M:%S')
        later = sorted(t for t in succ.get(pid, []) if ftd < t <= ftd + std)
        if later:
            row['second_deposit_at'] = later[0].strftime('%Y-%m-%d %H:%M')
    with open(path, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=LOG_FIELDS)
        w.writeheader()
        for row in rows.values():
            w.writerow({k: row.get(k, '') for k in LOG_FIELDS})
    return list(rows.values())


def effect(log_rows, as_of, o, value, second):
    """Эффект действий: доля вторых депозитов у тех, кому писали, против контрольной группы, у кого окно уже прошло."""
    std = dt.timedelta(days=o.std_days)
    done = [r for r in log_rows if dt.datetime.strptime(r['ftd_time'], '%Y-%m-%d %H:%M:%S') + std <= as_of
            and r['variant'] not in SERVICE]
    if not done:
        return None

    def block(rows):
        c = [r for r in rows if r['group'] == 'contact']
        k = [r for r in rows if r['group'] == 'control']
        if not c or not k:
            return None
        pc = sum(bool(r['second_deposit_at']) for r in c) / len(c)
        pk = sum(bool(r['second_deposit_at']) for r in k) / len(k)
        pool = (pc * len(c) + pk * len(k)) / (len(c) + len(k))
        se = math.sqrt(pool * (1 - pool) * (1 / len(c) + 1 / len(k))) if 0 < pool < 1 else 0
        return {'contact': len(c), 'control': len(k), 'rate_contact': pc, 'rate_control': pk, 'uplift': pc - pk,
                'z': (pc - pk) / se if se else 0.0, 'extra': (pc - pk) * len(c)}
    total = block(done)
    if not total:
        return None
    first = min(dt.datetime.strptime(r['first_listed'], '%Y-%m-%d %H:%M') for r in done)
    last = max(dt.datetime.strptime(r['first_listed'], '%Y-%m-%d %H:%M') for r in done)
    months = max(1.0, (last - first).total_seconds() / 86400 + 1) / 30
    total['extra_month'] = total['extra'] / months
    total['money_month_max'] = total['extra_month'] * value if value else None
    total['money_month_min'] = total['extra_month'] * second if second else None
    total['period'] = [first.strftime('%Y-%m-%d'), last.strftime('%Y-%m-%d')]
    by = {}
    for s in SCENARIOS:
        b = block([r for r in done if r['reason'] == s])
        if b and b['control'] >= 30:
            by[s] = b
    total['by_scenario'] = by
    return total


def profile_view(profile, n_own):
    """Вводные проекта для отчета: только ваши данные. Бенчмарков второго депозита нет: надежных публичных цифр
    нет ни по одной стране, поэтому без истории скилл их не подставляет."""
    if not profile:
        return {'rows': [], 'n_own': 0, 'reliable': False, 'created': None, 'source': None}
    std = profile.get('std') or {}
    red = profile.get('redeposit') or {}
    pairs = [('std_24h', std.get('std_24h')), ('std_72h', std.get('std_72h')), ('std_7d', std.get('std_7d')), ('std_30d', std.get('std_30d')),
             ('second_to_ftd', red.get('second_to_ftd')), ('hours_to_std', red.get('hours_to_std')),
             ('deposits_per_returner', red.get('deposits_per_returner')), ('second_deposit', red.get('second_deposit')),
             ('sumdep_per_returner', red.get('sumdep_per_returner')), ('sumdep_per_ftd', red.get('sumdep_per_ftd')),
             ('approval_all', profile.get('approval_all')), ('withdraw_hours', profile.get('payout_hours'))]
    return {'rows': [{'key': k, 'own': v} for k, v in pairs if v is not None], 'n_own': n_own, 'reliable': n_own >= RELIABLE_FTD,
            'created': profile.get('created'), 'source': 'history'}


def load_profile(o):
    paths = [o.profile] if o.profile else [os.path.join(o.out, 'profile.json'), os.path.join(o.out, 'baseline.json')]
    for path in paths:
        if path and os.path.exists(path):
            try:
                return json.load(open(path, encoding='utf-8')), path
            except (json.JSONDecodeError, OSError):
                continue
    return None, paths[0]


def analyze(data, quality, o):
    rules = sd_geo.load()
    recs, meta = build(data, quality, o, rules)
    as_of = meta['as_of']
    std = dt.timedelta(days=o.std_days)
    mature = [r for r in recs if not r.rg and r.ftd <= as_of - std]
    base_saved, base_path = load_profile(o)
    mix = geo_mix(recs)
    common = {
        'lang': o.lang, 'demo': bool(data.get('demo')), 'currency': data['currency'], 'as_of': as_of.strftime('%Y-%m-%d %H:%M'),
        'data_from': meta['data_start'].strftime('%Y-%m-%d'),
        'params': {'std_days': o.std_days, 'value_days': o.value_days, 'rescue_hours': o.rescue_hours, 'heavy_wager': o.heavy_wager,
                   'burn_turnover': o.burn_turnover, 'slow_withdrawal_hours': o.slow_withdrawal_hours, 'min_group': o.min_group,
                   'control_share': o.control_share, 'country': o.country},
        'files': {k: v['rows'] for k, v in quality['files'].items()},
        'files_used': {k: v['paths'] for k, v in quality['files'].items() if v.get('latest')},
        'bonus_names': bonus_names(data['bonuses'], o.heavy_wager),
        'deposit_statuses': quality.get('deposit_statuses', {}),
        'quality': {'unmapped_status': quality['unmapped_status'], 'unmapped_type': quality['unmapped_type'],
                    'missing_fx': quality['missing_fx'], 'bad_values': quality['bad_values'], 'tz': quality.get('tz', {})},
    }
    segs, baseline = [], None
    if len(mature) >= MIN_MATURE:
        summary, segs, appr, baseline = full_analysis(recs, meta, data, quality, o)
        summary.update(common)
        summary['params']['value_days'] = summary.pop('params_value_days')
        value, second = baseline['value_per_returner'], baseline['second_deposit']
        profile = baseline
        summary['profile_view'] = profile_view(baseline, summary['overall']['ftd'])
    else:
        caveats = []
        common_caveats(meta, quality, caveats)
        profile = base_saved
        if base_saved:
            appr = {(c, m): (n, rate) for c, m, n, rate in base_saved.get('approval', [])}
            cuts = base_saved.get('cuts', [])
        else:
            caveats.append('no_baseline')
            appr = approval_table(data['deposits'], data['players'], o.min_group)
            cuts = make_bands([r.amt for r in recs]) if recs else []
        for r in recs:
            r.band = band_of(cuts, r.amt)
        summary = dict(common, mode='list', caveats=caveats, ftd_rule=meta['rule'], rg_excluded_ftd=sum(1 for r in recs if r.rg),
                       ftd_in_data=len(recs), mature_ftd=len(mature),
                       baseline={k: base_saved.get(k) for k in ('created', 'cohort_from', 'cohort_to', 'ftd', 'std_rate', 'norm_rate')} if base_saved else None,
                       history=base_saved.get('scenarios') if base_saved else None,
                       profile_view=profile_view(base_saved, base_saved.get('ftd', 0) if base_saved else 0))
        value = base_saved.get('value_per_returner') if base_saved else None
        second = base_saved.get('second_deposit') if base_saved else None
    rescue, excluded, info = build_rescue(recs, as_of, o, appr, rules, data.get('method_types') or {})
    summary['rescue'] = info
    summary['forecast'] = forecast(rescue, profile, o.std_days * 24)
    summary['geo'] = mix
    summary['geo_rules'] = geo_summary(rules, recs, data, o, info)
    summary['readiness'] = readiness(meta, data, quality, recs, len(mature), bool(profile), rules)
    os.makedirs(o.out, exist_ok=True)
    log_rows = update_log(os.path.join(o.out, 'rescue_log.csv'), rescue, data, as_of, o)
    summary['effect'] = effect(log_rows, as_of, o, value, second)
    summary['log_size'] = len(log_rows)
    return summary, rescue, excluded, segs, baseline


def readiness(meta, data, quality, recs, mature_n, has_profile, rules):
    """Готовность данных: какие причины посчитаются, чего не хватает в выгрузке, какой будет режим."""
    avail = meta['avail']
    reasons = [s for s in SCENARIOS if s != 'other']
    has_wd = bool(data['withdrawals'])

    def need(s):
        if s in ('persist', 'failed', 'ftd_friction'):
            return 'failed_attempts'
        if s == 'withdrew' or (s in ('wd_rejected', 'wd_slow', 'bonus_wd') and not has_wd):
            return 'withdrawals'
        return {'wd_rejected': 'wd_status', 'wd_slow': 'wd_done_time', 'kyc': 'kyc_time', 'heavy_bonus': 'bonuses',
                'bonus_wd': 'bonuses'}.get(s, 'bets')
    missing = {}
    for s in reasons:
        if not avail.get(s):
            missing.setdefault(need(s), []).append(s)
    known = [r for r in recs if r.country and r.country != '-']
    restricted = any(sd_geo.rule(rules, r.code).get('banned') or sd_geo.rule(rules, r.code).get('allowed') for r in known)
    mtypes = data.get('method_types') or {}
    untyped = sorted({x[4] for x in data['deposits'] if x[4] and sd_geo.method_type(mtypes, x[4]) is None}) if restricted else []
    return {'reasons_ok': [s for s in reasons if avail.get(s)], 'reasons_total': len(reasons), 'missing': missing,
            'mode': 'full' if mature_n >= MIN_MATURE else 'list', 'ftd': len(recs), 'mature_ftd': mature_n, 'min_mature': MIN_MATURE,
            'days': (meta['as_of'] - meta['data_start']).days, 'ftd_rule': meta['rule'], 'profile': has_profile,
            'country_share': len(known) / len(recs) if recs else 0.0, 'untyped_methods': untyped,
            'rg_flags': quality.get('rg_flags', False)}


def check(data, quality, o):
    """Только готовность данных (--check): без расчета и без файлов."""
    rules = sd_geo.load()
    recs, meta = build(data, quality, o, rules)
    mature_n = sum(1 for r in recs if not r.rg and r.ftd <= meta['as_of'] - dt.timedelta(days=o.std_days))
    return readiness(meta, data, quality, recs, mature_n, bool(load_profile(o)[0]), rules)


def print_readiness(rd, tr):
    names = lambda keys: ', '.join(tr['sc'][k][0] for k in keys)
    need = sd_report.RU['need']
    line = f"Готовность данных: посчитается {len(rd['reasons_ok'])} из {rd['reasons_total']} причин."
    if rd['missing']:
        line += ' Не посчитаются: ' + '; '.join(f"{names(keys)} (нужно: {need[k]})" for k, keys in rd['missing'].items()) + '.'
    print(line)
    if rd['mode'] == 'full':
        print(f"Режим: полный. FTD в выгрузке {rd['ftd']}, старше окна второго депозита {rd['mature_ftd']} (нужно от {rd['min_mature']}),"
              f" период {rd['days']} дн.")
    else:
        print(f"Режим: список. FTD старше окна второго депозита {rd['mature_ftd']}, для полного расчета нужно от {rd['min_mature']}. "
              + ('Профиль проекта есть: прогноз и способы оплаты из него.' if rd['profile'] else
                 'Профиля нет: норма, прогноз и деньги появятся с 8-го дня или сразу после выгрузки за 60-120 дней.'))
    extra = []
    if rd['ftd'] and rd['country_share'] < .9:
        extra.append(f"страна есть у {rd['country_share']:.0%} FTD: правила стран и норма по стране только для них,"
                     " для проекта в одной стране запускайте с --country")
    if not rd['rg_flags']:
        extra.append('флагов ответственной игры нет: исключать самоисключенных придется в CRM')
    if rd['untyped_methods']:
        extra.append('тип не определен у способов оплаты ' + ', '.join(rd['untyped_methods'][:6])
                     + ': задайте method_types, чтобы правила стран не подсказали запрещенный способ')
    if extra:
        print('Проверьте: ' + '; '.join(extra) + '.')


def send_after(r, variant, as_of):
    """Когда отправлять, UTC: сейчас (момент среза), повод вернуться через 2 дня после выплаты,
    поздравление с выигрышем не раньше 48 часов после FTD."""
    if variant == 'withdrew_paid' and (r.wd_done or r.wd_time):
        return max(as_of, (r.wd_done or r.wd_time) + 2 * DAY)
    if variant == 'won_kept':
        return max(as_of, r.ftd + 2 * DAY)
    return as_of


def list_rows(summary, rescue, tr, lang):
    """Строки списка для CRM: коды причины и действия, приоритет, время отправки UTC и тексты на языке отчета."""
    as_of = dt.datetime.strptime(summary['as_of'], '%Y-%m-%d %H:%M')
    rows = []
    for r, variant, sugg, rate, group, notes in rescue:
        control = group == 'control'
        code = 'control' if control else variant
        rows.append({
            'player_id': r.pid, 'group': group, 'priority': '' if control else PRIORITY.get(variant, 3), 'reason_code': r.scenario,
            'action_code': code, 'send_after_utc': '' if control else send_after(r, variant, as_of).strftime('%Y-%m-%d %H:%M'),
            'snapshot_utc': summary['as_of'], 'ftd_time': r.ftd.strftime('%Y-%m-%d %H:%M'), 'ftd_amount': f'{r.amt:.2f}',
            'currency': summary['currency'], 'hours_since_ftd': f'{r.hours_since:.0f}', 'reason': tr['sc'][r.scenario][0],
            'state': state_text(r, variant, tr, lang), 'when': tr['when'][code], 'action': tr['act_var'][code],
            'suggested_method': '' if control else sugg + (f' ({rate:.0%})' if rate else ''),
            'country_rules': '' if control else sd_report.geo_note_text(notes, lang), 'failed_attempts': r.failed_n or '',
            'failed_method': r.failed_method, 'withdrawal_amount': f'{r.wd_amt:.2f}' if r.wd_amt else '', 'bonus': r.bonus_name,
            'country': r.country, 'source': r.source})
    return rows


def write_csv(path, rows, fields):
    with open(path, 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)


def write_list_xlsx(path, rows, index, tr):
    """Тот же список в Excel для чтения глазами: CSV с запятыми в русском и украинском Excel открывается одной колонкой."""
    sheets = []
    for name, fields, data, widths in ((tr['xlsx_actions'], ACTION_FIELDS, index, [18, 9, 9, 30, 22, 70, 22]),
                                       (tr['xlsx_list'], LIST_FIELDS, rows, [13, 9, 9, 14, 16, 17, 17, 17, 11, 9, 9, 26, 26, 22, 60, 22, 50, 9, 14, 12, 18, 9, 14])):
        sh = sd_xlsx.Sheet(name, widths=widths, tab='4E47FF' if fields is ACTION_FIELDS else '9AA3B5')
        sh.row(*[(f, 'header') for f in fields], height=20)
        for row in data:
            sh.row(*[(row[f], 'wrap') if f in ('action', 'state', 'country_rules', 'reason') else row[f] for f in fields])
        sheets.append(sh)
    sd_xlsx.write(path, sheets)


def state_text(r, variant, tr, lang):
    """Состояние игрока для колонки state: отказ по лимиту, вывод в обработке или выплачен (и дольше ли законного срока),
    статус бонуса."""
    if variant == 'deposit_limit':
        if r.fail_src == 'amount' and r.fail_rule:
            return tr['state']['limit_amount'].format(c=r.code, v=sd_report.fmt_money(r.fail_sum, 'EUR', lang),
                                                      period=tr['period'][r.fail_rule.get('period', 'month')])
        return tr['state']['limit_reason']
    if variant.endswith('_pending'):
        text = tr['state']['pending'].format(t=r.wd_time.strftime('%d.%m %H:%M'))
    elif variant.endswith('_paid'):
        text = tr['state']['paid'].format(t=(r.wd_done or r.wd_time).strftime('%d.%m %H:%M'))
    elif r.scenario == 'heavy_bonus' and r.heavy_status:
        return tr['state']['bonus_' + r.heavy_status]
    else:
        return ''
    if r.over_legal and r.legal_h:
        text += tr['state']['over_legal'].format(c=r.code, h=sd_report.fmt_hours(r.legal_h, lang))
    return text


def write_outputs(summary, rescue, excluded, segs, baseline, o):
    os.makedirs(o.out, exist_ok=True)
    tr = sd_report.LANGS[o.lang]
    # список для CRM: общий файл, папка с датой среза, файл на каждое действие и сводка действий
    rows = list_rows(summary, rescue, tr, o.lang)
    groups = {}
    for row in rows:
        groups.setdefault(row['action_code'], []).append(row)
    index = [{'action_code': code, 'priority': g[0]['priority'], 'players': len(g), 'reason': ', '.join(dict.fromkeys(x['reason'] for x in g)),
              'when': g[0]['when'], 'action': g[0]['action'], 'file': f'{code}.csv'} for code, g in groups.items()]
    day = summary['as_of'][:10]
    day_dir = os.path.join(o.out, 'lists', day)
    summary['rescue']['list_dir'] = os.path.join('lists', day)
    summary['rescue']['actions'] = {x['action_code']: x['players'] for x in index}
    with open(os.path.join(o.out, 'summary.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2, default=str)
    if baseline:
        with open(o.profile or os.path.join(o.out, 'profile.json'), 'w', encoding='utf-8') as f:
            json.dump(baseline, f, ensure_ascii=False, indent=2)
    if summary['mode'] == 'full':
        with open(os.path.join(o.out, 'scenarios.csv'), 'w', newline='', encoding='utf-8-sig') as f:
            w = csv.writer(f)
            w.writerow(['scenario', 'name', 'ftd', 'share', 'std_rate', 'norm_rate', 'missing_second_deposits_month',
                        'lost_sum_dep_month_min', 'lost_sum_dep_month_max', 'z', 'available'])
            for x in summary['scenarios']:
                w.writerow([x['key'], tr['sc'][x['key']][0], x['n'], f"{x['share']:.4f}", f"{x['rate']:.4f}", f"{x['expected_rate']:.4f}",
                            f"{x['gap_players_month']:.1f}", f"{x['lost_month_min']:.0f}", f"{x['lost_month']:.0f}", f"{x['z']:.1f}",
                            'yes' if x['available'] else 'no'])
        with open(os.path.join(o.out, 'segments.csv'), 'w', newline='', encoding='utf-8-sig') as f:
            w = csv.writer(f)
            w.writerow(['dimension', 'group', 'ftd', 'std_rate', 'expected_rate', 'lost_sum_dep_month_min', 'lost_sum_dep_month_max', 'z', 'significant'])
            for x in segs:
                w.writerow([x['dim'], sd_report.group_label(x, summary, tr), x['n'], f"{x['rate']:.4f}", f"{x['expected_rate']:.4f}",
                            f"{x['lost_month_min']:.0f}", f"{x['lost_month']:.0f}", f"{x['z']:.1f}", 'yes' if x['significant'] else 'no'])
    write_csv(os.path.join(o.out, 'rescue_list.csv'), rows, LIST_FIELDS)
    os.makedirs(day_dir, exist_ok=True)
    for old in glob.glob(os.path.join(day_dir, '*.csv')):
        os.remove(old)  # повторный запуск за ту же дату: файлы действий, которых больше нет, не должны остаться
    write_csv(os.path.join(day_dir, 'rescue_list.csv'), rows, LIST_FIELDS)
    write_csv(os.path.join(day_dir, 'actions.csv'), index, ACTION_FIELDS)
    for code, g in groups.items():
        write_csv(os.path.join(day_dir, f'{code}.csv'), g, LIST_FIELDS)
    write_list_xlsx(os.path.join(day_dir, 'rescue_list.xlsx'), rows, index, tr)
    with open(os.path.join(o.out, 'excluded_rg.csv'), 'w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(['player_id', 'ftd_time', 'reasons'])
        for r in excluded:
            w.writerow([r.pid, r.ftd.strftime('%Y-%m-%d %H:%M'), '; '.join(tr['rg_bank_block'] if x == 'bank_block' else x for x in r.rg)])
    with open(os.path.join(o.out, 'report.html'), 'w', encoding='utf-8') as f:
        f.write(sd_report.render(summary))
    shutil.copyfile(os.path.join(o.out, 'report.html'), os.path.join(day_dir, 'report.html'))


def print_summary(s):
    tr = sd_report.LANGS[s['lang']]
    cur, lang = s['currency'], s['lang']
    money = lambda x: sd_report.fmt_money(x, cur, lang).replace(' ', ' ')
    used = [os.path.basename(p) for f in s.get('files_used', {}).values() for p in f]
    if used:
        print('Взяты самые свежие выгрузки: ' + ', '.join(dict.fromkeys(used)))
    print_readiness(s['readiness'], tr)
    if s['mode'] == 'full':
        ov = s['overall']
        print(f"Полный режим. Когорта FTD {s['cohort_from']} - {s['cohort_to']}: {ov['ftd']} FTD, второй депозит за {s['params']['std_days']:g} дн."
              f" у {ov['std_rate']:.1%} (норма без проблемных сигналов {ov['norm_rate']:.1%})")
        print(f"Недобор в месяц: {ov['gap_players_month']:.0f} {sd_report.plural(ov['gap_players_month'], tr['deps'], lang)},"
              f" Sum Dep от {money(ov['lost_month_min'])} (только вторые депозиты) до {money(ov['lost_month'])} (Sum Dep вернувшегося за {s['params']['value_days']:g} дн.)")
        nl = s['norm_levels']
        print(f"Норма похожих игроков: по размеру FTD, источнику и стране {nl['ftd_source_country']} FTD, по размеру и источнику {nl['ftd_source']},"
              f" только по размеру {nl['ftd']}, общая {nl['overall']}")
        print('Показатели: ' + '; '.join(f"{tr['metric'][k][0]}: {sd_report.fmt_metric(k, v, cur, lang)}" for k, v in s['metrics'].items()))
        if s['weekly']:
            print('Второй депозит по неделям FTD: ' + ', '.join(f"{w['week'][5:]} {w['rate']:.0%}" for w in s['weekly']))
        print('Причины (недобор в месяц):')
        for x in s['scenarios']:
            name = tr['sc'][x['key']][0]
            if not x['available']:
                print(f"  {name}: нет данных")
                continue
            print(f"  {name}: FTD {x['n']} ({x['share']:.0%}), STD {x['rate']:.0%} при норме {x['expected_rate']:.0%}, недобор"
                  f" {x['gap_players_month']:.0f} {sd_report.plural(x['gap_players_month'], tr['deps'], lang)}, {money(x['lost_month_min'])} - {money(x['lost_month'])}")
        if s['segments']:
            print('Срезы с разрывом больше случайного:')
            for x in s['segments']:
                print(f"  {tr['dim'][x['dim']]}: {sd_report.group_label(x, s, tr)}: FTD {x['n']}, STD {x['rate']:.0%} при ожидаемых"
                      f" {x['expected_rate']:.0%}, до {money(x['lost_month'])} в месяц")
        print('Профиль проекта для ежедневных запусков сохранен: profile.json')
    else:
        b = s.get('baseline')
        print(f"Режим списка: FTD старше {s['params']['std_days']:g} дн. в выгрузке {s['mature_ftd']} (для полного расчета нужно от {MIN_MATURE})."
              + (f" База от {b['created']} (когорта {b['cohort_from']} - {b['cohort_to']})" if b else ' Базы нет: способы оплаты по этой выгрузке, норма и деньги не считаются'))
    if s['bonus_names']:
        print('Бонусы (название: вейджер, тяжелый или нет, сколько начислено): ' + '; '.join(
            f"{x['name']}: {'x%g' % x['wager'] if x['wager'] is not None else 'вейджер не найден'}{', тяжелый' if x['heavy'] else ''} ({x['count']})"
            for x in s['bonus_names'][:8]))
    st = s['deposit_statuses']
    if st:
        print('Попытки депозита по статусам: ' + ', '.join(f'{k} {v}' for k, v in sorted(st.items(), key=lambda kv: -kv[1]))
              + ' (cancelled и abandoned считаются неудачной попыткой, pending не учитывается)')
    r = s['rescue']
    print(f"Список на {r['snapshot']}: {r['total']} игроков из {r['ftd_in_window']} FTD за {s['params']['rescue_hours']:g} ч"
          f" (уже вернулись {r['with_second_deposit']}, исключены по ответственной игре {r['excluded_rg']}); писать {r['contact']},"
          f" контрольная группа {r['control']}: " + ', '.join(f"{tr['sc'][k][0]} {v}" for k, v in sorted(r['by_scenario'].items(), key=lambda kv: -kv[1])))
    fc = s.get('forecast')
    if fc:
        print(f"Прогноз по списку из профиля: без действий вернутся около {fc['expected_returns']:.0f} из {fc['listed']},"
              f" до нормы не хватает {fc['gap']:.0f} вторых депозитов, от {money(fc['money_min'])} до {money(fc['money_max'])}")
    pv = s.get('profile_view') or {}
    if pv.get('rows'):
        print(f"Вводные из профиля ({pv['n_own']} FTD{'' if pv['reliable'] else ', меньше 300: цифры шумные'}): " + '; '.join(
            f"{tr['metric'].get(x['key'], (x['key'],))[0]}: {sd_report.fmt_metric(x['key'], x['own'], cur, lang)}" for x in pv['rows']))
    else:
        print('Профиля нет: норма, прогноз и деньги появятся с 8-го дня, когда у первых FTD пройдет 7 дней и их наберется 50.'
              ' Публичного бенчмарка второго депозита нет, чужие цифры не подставляются')
    if s.get('geo'):
        print('Страны проекта (доля FTD): ' + ', '.join(f"{c} {w:.0%}" for c, w in list(s['geo'].items())[:8]))
    g = s.get('geo_rules')
    if g:
        if g['countries']:
            print('Правила стран: ' + '; '.join(sd_report.geo_rule_line(c, lang) for c in g['countries']))
        a = g['applied']
        print(f"Учтено по правилам стран: отказ по лимиту {a['limit_reason']} по причине из выгрузки и {a['limit_amount']} по суммам,"
              f" блокировка гемблинга в банке {a['bank_block']} (исключены), долгий вывод по законному сроку {a['slow_by_law']},"
              f" вывод дольше законного срока {a['over_legal']}, в списке пропущено запрещенных способов {a['banned_skipped']}")
        if g['banned_in_data']:
            print('Попытки депозита способами, запрещенными в стране: ' + '; '.join(
                f"{c}: " + ', '.join(f'{t} {n}' for t, n in v.items()) for c, v in g['banned_in_data'].items()))
        if g['no_rules']:
            print('Страны без правил в справочнике: ' + ', '.join(g['no_rules']) + f" (порог долгого вывода {g['default_slow_h']:g} ч)")
    e = s.get('effect')
    if e:
        print(f"Эффект по журналу ({e['period'][0]} - {e['period'][1]}): писали {e['contact']}, вернулись {e['rate_contact']:.1%};"
              f" контрольная {e['control']}, вернулись {e['rate_control']:.1%}; разница {e['uplift'] * 100:+.1f} п.п., z {e['z']:.1f}")
    else:
        print(f"Эффект: пока нет игроков из журнала с прошедшим окном второго депозита (в журнале {s['log_size']})")
    q = s['quality']
    for key, label in (('unmapped_type', 'Типы операций без сопоставления (строки не учтены)'), ('bad_values', 'Не разобраны значения')):
        if q[key]:
            print(f'{label}: {q[key]}')
    if 'mixed_tz' in s['caveats']:
        print('Пояса: ' + '; '.join(f"{k}: {'с поясом' if v['explicit'] else 'без пояса'}{'' if v['offset'] is None else ', tz %+g' % v['offset']}"
                                    for k, v in q['tz'].items()) + '. Уточните пояс файлов без пояса и задайте "tz" в mapping.json')
    if s['caveats']:
        print('Оговорки:', ', '.join(s['caveats']))


def check_quality(q):
    """Останавливает расчет, если разбор исказит цифры: статусы без сопоставления, валюты без курса, массово неразобранные даты."""
    problems = []
    if q['unmapped_status']:
        problems.append('статусы без сопоставления в mapping.json (депозиты и выводы: success, declined, abandoned, pending, cancelled;'
                        ' бонусы: active, lost, expired, completed, cancelled): '
                        + ', '.join(f'"{k}" ({v})' for k, v in q['unmapped_status'].items()))
    if q['missing_fx']:
        problems.append('валюты без курса к валюте отчета (добавьте в "fx" курс: сколько единиц валюты отчета в одной единице валюты): '
                        + ', '.join(f'{k} ({v} строк)' for k, v in q['missing_fx'].items()))
    for name, bad in q['bad_values'].items():
        rows = q['files'].get(name, {}).get('rows') or 1
        for field, n in bad.items():
            if n / rows > .2:
                problems.append(f'{name}: не разобрано поле {field} в {n} из {rows} строк (формат даты, dayfirst или decimal)')
    if problems:
        raise MappingError('исправьте mapping.json и запустите снова:\n- ' + '\n- '.join(problems))


def main(argv=None):
    o = parse_args(argv)
    if o.as_of:
        from sd_common import parse_time
        o.as_of = parse_time(o.as_of)
    try:
        m = load_mapping(o.mapping)
        data, quality = load_data(m)
        check_quality(quality)
        if o.check:
            print_readiness(check(data, quality, o), sd_report.LANGS[o.lang])
            return
        summary, rescue, excluded, segs, baseline = analyze(data, quality, o)
    except MappingError as e:
        print(f'Ошибка: {e}')
        sys.exit(2)
    write_outputs(summary, rescue, excluded, segs, baseline, o)
    print_summary(summary)
    files = 'report.html (отчет), rescue_list.csv (список для CRM), rescue_log.csv (журнал для оценки эффекта), summary.json (итоги), excluded_rg.csv'
    if summary['mode'] == 'full':
        files += ', scenarios.csv и segments.csv (таблицы), profile.json (профиль проекта для ежедневных запусков)'
    print(f'Файлы в {os.path.abspath(o.out)}: {files}')
    acts = summary['rescue'].get('actions') or {}
    print(f"Список на {summary['rescue']['snapshot']} по действиям: {os.path.join(os.path.abspath(o.out), summary['rescue']['list_dir'])}"
          f" (actions.csv сводка, rescue_list.xlsx для Excel, файл на каждое действие для CRM: "
          + ', '.join(f'{k}.csv {v}' for k, v in acts.items()) + ')')


if __name__ == '__main__':
    main()
