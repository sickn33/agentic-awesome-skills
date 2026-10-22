"""Синтетические выгрузки для демо: python3 make_demo.py <папка> [--players 12000] [--seed 7] [--truth] [--xlsx]

Пишет в папку четыре файла в виде, похожем на выгрузки из бэк-офиса, и готовый mapping.json:
  payments.csv       депозиты и выводы одной таблицей: статусы, способы оплаты, время выплаты вывода
  bonuses.csv        начисленные бонусы с вейджером и итогом
  game_activity.csv  ставки и выигрыши по игроку за день
  players.csv        регистрация, страна, источник, флаги ответственной игры, запрос документов
--xlsx вместо этого пишет одну книгу export.xlsx в формате examples/export-example.xlsx.
Все данные вымышлены: доли ситуаций и вероятности возврата заданы ниже, за ними нет ни одного оператора.
--truth дописывает _truth.csv с причиной каждого FTD по тем же правилам, что у скрипта анализа (для проверки).
"""
import argparse
import csv
import datetime as dt
import json
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sd_geo  # noqa: E402

END = dt.datetime(2026, 10, 16, 21, 40)
DAYS = 120
COUNTRIES = [('CA', .17), ('NZ', .08), ('FI', .07), ('BR', .18), ('MX', .12), ('CL', .1), ('PE', .08), ('JP', .12), ('DE', .08)]
METHODS = {
    'CA': [('Card', .55), ('E-wallet', .25), ('Voucher', .1), ('Crypto', .1)],
    'NZ': [('Card', .6), ('E-wallet', .25), ('Crypto', .15)],
    'FI': [('Bank transfer', .55), ('Card', .3), ('E-wallet', .15)],
    'BR': [('Instant transfer', .72), ('Card', .28)],
    'DE': [('E-wallet', .5), ('Card', .35), ('Bank transfer', .15)],
    'MX': [('Card', .55), ('Voucher', .2), ('E-wallet', .15), ('Crypto', .1)],
    'CL': [('Card', .5), ('Bank transfer', .3), ('E-wallet', .2)],
    'PE': [('Card', .55), ('E-wallet', .25), ('Bank transfer', .2)],
    'JP': [('Card', .45), ('E-wallet', .25), ('Bank transfer', .2), ('Crypto', .1)],
}
APPROVAL = {'Card': .8, 'E-wallet': .93, 'Bank transfer': .9, 'Instant transfer': .94, 'Crypto': .96, 'Voucher': .92}
CARD_BY_COUNTRY = {'BR': .56, 'MX': .6, 'PE': .58, 'CL': .68, 'JP': .7, 'CA': .82, 'NZ': .85, 'FI': .86, 'DE': .84}
SOURCES = [('Affiliate 1', .26), ('Affiliate 2', .2), ('Affiliate 3', .12), ('SEO', .17), ('Paid social', .15), ('Referral', .1)]
SOURCE_STD = {'Affiliate 1': 1.0, 'Affiliate 2': .62, 'Affiliate 3': .95, 'SEO': 1.12, 'Paid social': .9, 'Referral': 1.22}
FTD_AMOUNTS = [(10, .2), (20, .24), (30, .1), (50, .2), (100, .14), (200, .07), (500, .03), (None, .02)]
# доли ситуаций
P_FAILED, P_WD_REJECTED, P_WD_SLOW, P_WD_FAST, P_KYC = .095, .025, .035, .06, .04
P_HEAVY, P_LIGHT, P_BURNED, P_WON, P_BALANCE = .3, .1, .23, .06, .075
# вероятность второго депозита за 7 дней по причине, до поправок на источник и размер депозита
STD_BASE = {'persist': .26, 'failed': .2, 'wd_rejected': .07, 'kyc': .14, 'bonus_wd': .1, 'wd_slow': .15, 'withdrew': .22,
            'heavy_bonus': .27, 'burned_fast': .13, 'won_kept': .24, 'balance_left': .1, 'ftd_friction': .37, 'other': .47}
# причины отказа: лимит депозитов и блокировка гемблинга в банке меняют действие (references/geo_rules.md)
DECLINE = [('Insufficient funds', .34), ('Do not honor', .2), ('3DS failed', .16), ('Issuer unavailable', .12),
           ('Deposit limit reached', .12), ('Gambling blocked by bank', .06)]
DECLINE_REASONS = {'limit': ['Deposit limit reached'], 'block': ['Gambling blocked by bank']}
RULES = sd_geo.load()
METHOD_TYPES = {'Card': 'card', 'E-wallet': 'ewallet', 'Bank transfer': 'online_banking', 'Instant transfer': 'instant_bank',
                'Crypto': 'crypto', 'Voucher': 'voucher_cash'}


def pick(rng, pairs):
    x, acc = rng.random() * sum(w for _, w in pairs), 0
    for v, w in pairs:
        acc += w
        if x <= acc:
            return v
    return pairs[-1][0]


def approval(country, method):
    return CARD_BY_COUNTRY[country] if method == 'Card' else APPROVAL[method]


def band_factor(amount):
    return .8 if amount <= 10 else .95 if amount <= 30 else 1.05 if amount <= 50 else 1.15 if amount <= 100 else 1.25


def money(x):
    return round(x, 2)


def write_xlsx(out, pay, bon, act, ply):
    """Демо в формате examples/export-example.xlsx: те же листы и колонки, готовый mapping.json рядом."""
    from make_example import HEADERS, template_mapping
    from sd_xlsx import Sheet, write
    ts = lambda s, f='%Y-%m-%d %H:%M:%S': dt.datetime.strptime(s, f) if s else None

    def sheet(name, rows, widths):
        sh = Sheet(name, widths=widths, tab='4E47FF' if name == 'Депозиты' else '9AA3B5')
        sh.row(*[(h, 'header') for h in HEADERS[name]], height=20)
        for r in rows:
            sh.row(*r)
        return sh

    def when(v, style='datetime'):
        return (v, style) if v else ''
    deps = [(int(r[1]), (ts(r[3]), 'datetime'), (float(r[4]), 'money'), r[5], r[6], r[7], r[8]) for r in pay if r[2] == 'Deposit']
    wds = [(int(r[1]), (ts(r[3]), 'datetime'), (float(r[4]), 'money'), r[5], r[6], when(ts(r[9]))) for r in pay if r[2] == 'Withdrawal']
    bons = [(int(r[0]), (ts(r[2], '%Y-%m-%d %H:%M'), 'datetime'), r[1], (int(r[4]), 'int'), (float(r[3]), 'money'), r[5]) for r in bon]
    bets = [(int(r[1]), (ts(r[0], '%Y-%m-%d'), 'date'), (float(r[2]), 'money'), (float(r[3]), 'money'), (int(r[4]), 'int')) for r in act]
    first = {}
    for r in pay:
        if r[2] == 'Deposit' and r[6] == 'Approved':
            first.setdefault(r[1], ts(r[3]))
    plys = [(int(r[0]), (ts(r[1], '%d.%m.%Y %H:%M'), 'datetime'), r[2], r[3], 'Yes' if r[4] == 'Yes' else '', 'Yes' if r[5] == 'Yes' else '',
             when(ts(r[6], '%d.%m.%Y %H:%M')), when(first.get(r[0]))) for r in ply]
    write(os.path.join(out, 'export.xlsx'), [sheet('Депозиты', deps, [12, 18, 11, 10, 18, 15, 22]), sheet('Выводы', wds, [12, 18, 11, 10, 12, 18]),
                                              sheet('Бонусы', bons, [12, 18, 22, 9, 11, 12]), sheet('Ставки', bets, [12, 13, 11, 11, 9]),
                                              sheet('Игроки', plys, [12, 18, 10, 14, 15, 15, 18, 18])])
    m = dict(template_mapping('export.xlsx'), demo=True, method_types=METHOD_TYPES)
    with open(os.path.join(out, 'mapping.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--players', type=int, default=12000)
    ap.add_argument('--seed', type=int, default=7)
    ap.add_argument('--truth', action='store_true')
    ap.add_argument('--xlsx', action='store_true', help='одна книга export.xlsx в формате примера выгрузки вместо CSV')
    a = ap.parse_args()
    rng = random.Random(a.seed)
    os.makedirs(a.out, exist_ok=True)
    start = END - dt.timedelta(days=DAYS)
    pay, bon, act, ply, truth = [], [], [], [], []
    tx = [100000]

    def add_pay(pid, kind, t, amount, status, method, reason='', done=None):
        if t > END:
            return False
        tx[0] += rng.randint(1, 9)
        pay.append([f'T{tx[0]}', pid, kind, t.strftime('%Y-%m-%d %H:%M:%S'), f'{amount:.2f}', 'EUR', status, method, reason,
                    done.strftime('%Y-%m-%d %H:%M:%S') if done else ''])
        return True

    def attempt(pid, t, amount, country, method, force=None):
        """Одна попытка депозита: True, если прошла."""
        ok = rng.random() < approval(country, method) if force is None else force
        if ok:
            add_pay(pid, 'Deposit', t, amount, 'Approved', method)
        elif rng.random() < .22:
            add_pay(pid, 'Deposit', t, amount, 'Cancelled by user', method)
        else:
            add_pay(pid, 'Deposit', t, amount, rng.choice(['Declined', 'Declined', 'Error']), method, pick(rng, DECLINE))
        return ok

    def day_rows(pid, t0, turnover, net_loss, avg_bet, spread_days=1):
        """Ставки за период дневными строками: net_loss = ставки минус выигрыши (минус означает выигрыш)."""
        days = max(1, spread_days)
        parts = [rng.random() + .3 for _ in range(days)]
        s = sum(parts)
        for i, p in enumerate(parts):
            day = (t0 + dt.timedelta(days=i)).date()
            if dt.datetime.combine(day, dt.time()) > END:
                break
            b = turnover * p / s
            w = max(0.0, b - net_loss * p / s)
            act.append([day.isoformat(), pid, f'{b:.2f}', f'{w:.2f}', max(1, int(b / max(avg_bet, .1)))])

    weights = [math.exp(i / DAYS * 1.1) for i in range(DAYS)]
    for n in range(a.players):
        pid = str(4100000 + n * 7 + rng.randint(0, 6))
        day = rng.choices(range(DAYS), weights)[0]
        reg = start + dt.timedelta(days=day, seconds=rng.randint(0, 86399))
        country, source = pick(rng, COUNTRIES), pick(rng, SOURCES)
        self_ex = rng.random() < .012
        limit = rng.random() < .03
        player = [pid, reg.strftime('%d.%m.%Y %H:%M'), country, source, 'Yes' if self_ex else 'No', 'Yes' if limit else 'No', '']
        ply.append(player)
        if rng.random() > .47:
            continue  # регистрация без депозита
        amount = pick(rng, FTD_AMOUNTS) or rng.choice([15, 25, 40, 75, 150, 300])
        method = pick(rng, METHODS[country])
        t = reg + dt.timedelta(minutes=rng.lognormvariate(3.2, 1.3))
        got, pre_fail = False, False
        for _ in range(4):
            if t > END:
                break
            if attempt(pid, t, amount, country, method):
                got = True
                break
            pre_fail = True
            t += dt.timedelta(minutes=rng.uniform(1, 12))
            r = rng.random()
            if r < .25:
                break
            if r < .7:
                method = pick(rng, METHODS[country])
        if not got:
            continue
        ftd, ftd_method = t, method
        # ситуация игрока: сначала признаки, потом причина по тем же правилам, что у скрипта анализа
        fail_p = P_FAILED * (1.7 if ftd_method == 'Card' and country in ('BR', 'MX', 'PE') else 1.0)
        fails_after = rng.choice([1, 1, 2, 3]) if rng.random() < fail_p else 0
        wd = None
        if not fails_after:
            r = rng.random()
            wd = 'rejected' if r < P_WD_REJECTED else 'slow' if r < P_WD_REJECTED + P_WD_SLOW else \
                'fast' if r < P_WD_REJECTED + P_WD_SLOW + P_WD_FAST else None
        kyc = not fails_after and not wd and rng.random() < P_KYC
        heavy = rng.random() < P_HEAVY
        light = not heavy and rng.random() < P_LIGHT / (1 - P_HEAVY)
        if wd:
            style = 'win'
        elif fails_after:
            style = 'lost'
        elif heavy:
            style = 'bonus_play'
        else:
            r = rng.random()
            style = 'burned' if r < P_BURNED else 'won' if r < P_BURNED + P_WON else 'balance' if r < P_BURNED + P_WON + P_BALANCE else 'normal'
        label = ('persist' if fails_after == 3 else 'failed' if fails_after else 'wd_rejected' if wd == 'rejected' else
                 'kyc' if kyc else 'bonus_wd' if (heavy or light) and wd in ('fast', 'slow') else 'wd_slow' if wd == 'slow' else
                 'withdrew' if wd == 'fast' else 'heavy_bonus' if heavy else 'burned_fast' if style == 'burned' else
                 'won_kept' if style == 'won' else 'balance_left' if style == 'balance' else 'ftd_friction' if pre_fail else 'other')
        p_std = min(.9, STD_BASE[label] * band_factor(amount) * SOURCE_STD[source])
        returns = rng.random() < p_std
        if heavy or light:
            name, wager, bamt = ('Welcome 100% x40', 40, amount) if heavy else ('Welcome 50 FS x10', 10, 5.0)
            recent = END - ftd < dt.timedelta(days=3)
            states = [('Active', .5), ('Lost', .4), ('Expired', .1)] if recent else \
                [('Lost', .7), ('Expired', .15), ('Wagered', .1), ('Cancelled', .05)] if heavy else [('Wagered', .4), ('Lost', .6)]
            bt = ftd + dt.timedelta(seconds=rng.randint(20, 240))
            if bt <= END:
                bon.append([pid, name, bt.strftime('%Y-%m-%d %H:%M'), f'{bamt:.2f}', wager, pick(rng, states)])
        # первая сессия: дневные строки за день FTD и следующий
        spread = 2 if ftd.hour >= 19 else 1
        style_rows = {
            'burned': (rng.uniform(1.0, 4.4), rng.uniform(.93, 1.0), rng.uniform(.06, .25)),
            'bonus_play': (2 * rng.uniform(5, 25), rng.uniform(.85, 1.0), rng.uniform(.01, .04)),
            'lost': (rng.uniform(6, 25), rng.uniform(.85, 1.0), rng.uniform(.005, .02)),
            'win': (rng.uniform(6, 20), -rng.uniform(.6, 4), rng.uniform(.01, .03)),
            'won': (rng.uniform(4, 15), -rng.uniform(.7, 2.5), rng.uniform(.01, .03)),
            'balance': (rng.uniform(.05, .75), rng.uniform(-.1, .3), rng.uniform(.005, .02)),
            'normal': (rng.uniform(8, 40), rng.uniform(.35, 1.0), rng.uniform(.005, .02)),
        }
        turn, loss, bet = style_rows[style]
        day_rows(pid, ftd, amount * turn, amount * loss, amount * bet, 1 if style in ('balance', 'won') else spread)
        # события после первой сессии
        t = ftd
        if fails_after:
            for k in range(fails_after):
                t += dt.timedelta(minutes=rng.uniform(15, 600) if k == 0 else rng.uniform(1, 8))
                attempt(pid, t, rng.choice([amount, amount, max(10, amount / 2)]), country, ftd_method, force=False)
        if wd:
            t += dt.timedelta(hours=rng.uniform(2, 30))
            amt_w = money(amount * rng.uniform(1.5, 5))
            if wd == 'rejected':
                add_pay(pid, 'Withdrawal', t, amt_w, 'Rejected', ftd_method)
            else:
                # быстрый вывод укладывается в законный срок страны (Бразилия 2 ч), долгий длиннее любого порога
                legal = sd_geo.rule(RULES, country).get('payout_hours') or 24
                done = t + dt.timedelta(hours=rng.uniform(30, 96) if wd == 'slow' else rng.uniform(.5, min(12, legal * .9)))
                add_pay(pid, 'Withdrawal', t, amt_w, 'Paid' if done <= END else 'Pending', ftd_method, done=done if done <= END else None)
                if done <= END:
                    t = done
        if kyc:
            kt = ftd + dt.timedelta(hours=rng.uniform(1, 48))
            if kt <= END:
                player[6] = kt.strftime('%d.%m.%Y %H:%M')
                t = max(t, kt)
        truth.append([pid, label, int(returns)])

        def play(t0, amt):
            # кто ставил крупно, ставит крупно и дальше
            if style == 'burned':
                day_rows(pid, t0, amt * rng.uniform(1.0, 4.4), amt * rng.uniform(.9, 1.0), amt * rng.uniform(.06, .25), 1)
            else:
                day_rows(pid, t0, amt * rng.uniform(6, 30), amt * rng.uniform(.4, 1.0), amt * rng.uniform(.005, .02), 1)
        if returns:
            t2 = max(t + dt.timedelta(minutes=30), ftd + dt.timedelta(hours=min(160, rng.lognormvariate(2.9, 1.1))))
            if style in ('balance', 'won'):
                t2 = ftd + dt.timedelta(hours=rng.uniform(74, 166))
            if t2 > ftd + dt.timedelta(days=7):
                t2 = ftd + dt.timedelta(days=rng.uniform(max(1, (t - ftd).total_seconds() / 86400 + .05), 6.95))
            m2 = pick(rng, [(x, w) for x, w in METHODS[country] if x != ftd_method]) if fails_after else ftd_method
            attempt(pid, t2, money(amount * rng.lognormvariate(0, .35)), country, m2, force=True)
            later = 1 + int(rng.expovariate(1 / (3.2 * band_factor(amount))))
            tt = t2
            for _ in range(later):
                tt += dt.timedelta(hours=rng.uniform(10, 150))
                if tt > ftd + dt.timedelta(days=45) or tt > END:
                    break
                amt = money(max(10, amount * rng.lognormvariate(.1, .5)))
                if not attempt(pid, tt, amt, country, m2):
                    attempt(pid, tt + dt.timedelta(minutes=rng.uniform(1, 9)), amt, country, pick(rng, METHODS[country]), force=True)
                play(tt, amt)
                if rng.random() < .12:
                    rname = rng.choice(['Reload 50% x35', 'Weekly 30 FS x10'])
                    bon.append([pid, rname, (tt + dt.timedelta(minutes=2)).strftime('%Y-%m-%d %H:%M'),
                                f'{amt / 2:.2f}', 35 if 'x35' in rname else 10, rng.choice(['Lost', 'Wagered', 'Expired'])])
            play(t2, amount)
        elif rng.random() < .07:
            tl = ftd + dt.timedelta(days=rng.uniform(8, 40))
            amt = money(amount * rng.lognormvariate(0, .4))
            if attempt(pid, tl, amt, country, ftd_method, force=True):
                day_rows(pid, tl, amt * rng.uniform(6, 30), amt * rng.uniform(.4, 1.0), amt * rng.uniform(.005, .02), 1)

    pay.sort(key=lambda r: r[3])
    act.sort(key=lambda r: (r[0], r[1]))
    if a.xlsx:
        write_xlsx(a.out, pay, bon, act, ply)
        print(f'Демо-данные в {a.out}/export.xlsx: игроков {len(ply)}, FTD {len(truth)}, платежей {len(pay)}, бонусов {len(bon)}, строк активности {len(act)}')
        return
    files = {
        'payments.csv': (['Transaction ID', 'Player ID', 'Type', 'Created At (UTC)', 'Amount', 'Currency', 'Status', 'Payment Method',
                          'Decline Reason', 'Processed At'], pay),
        'bonuses.csv': (['Player', 'Bonus', 'Activated', 'Amount', 'Wager', 'State'], bon),
        'game_activity.csv': (['Date', 'Player ID', 'Bets, EUR', 'Wins, EUR', 'Rounds'], act),
        'players.csv': (['Player ID', 'Registered', 'Country', 'Traffic source', 'Self-exclusion', 'Deposit limit', 'KYC Requested'], ply),
    }
    if a.truth:
        files['_truth.csv'] = (['player', 'scenario', 'returns'], truth)
    for name, (header, rows) in files.items():
        with open(os.path.join(a.out, name), 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(header)
            w.writerows(rows)
    mapping = {
        'demo': True,
        'currency': 'EUR',
        'method_types': METHOD_TYPES,
        'files': {
            'transactions': {
                'path': 'payments.csv',
                'columns': {'player_id': 'Player ID', 'time': 'Created At (UTC)', 'amount': 'Amount', 'currency': 'Currency',
                            'status': 'Status', 'type': 'Type', 'method': 'Payment Method', 'done_time': 'Processed At',
                            'reason': 'Decline Reason'},
                'type': {'deposit': ['Deposit'], 'withdrawal': ['Withdrawal']},
                'status': {'success': ['Approved', 'Paid'], 'declined': ['Declined', 'Error', 'Rejected'],
                           'abandoned': ['Cancelled by user'], 'pending': ['Pending']},
                'decline_reasons': DECLINE_REASONS,
            },
            'bonuses': {'path': 'bonuses.csv', 'columns': {'player_id': 'Player', 'time': 'Activated', 'name': 'Bonus', 'wager': 'Wager',
                                                           'amount': 'Amount', 'status': 'State'},
                        'status': {'active': ['Active'], 'lost': ['Lost'], 'expired': ['Expired'], 'completed': ['Wagered'], 'cancelled': ['Cancelled']}},
            'bets': {'path': 'game_activity.csv', 'columns': {'player_id': 'Player ID', 'time': 'Date', 'bets': 'Bets, EUR', 'wins': 'Wins, EUR', 'rounds': 'Rounds'}},
            'players': {'path': 'players.csv', 'dayfirst': True,
                        'columns': {'player_id': 'Player ID', 'reg_time': 'Registered', 'country': 'Country', 'source': 'Traffic source',
                                    'kyc_time': 'KYC Requested'},
                        'rg_flags': ['Self-exclusion', 'Deposit limit']},
        },
    }
    with open(os.path.join(a.out, 'mapping.json'), 'w', encoding='utf-8') as f:
        json.dump(mapping, f, ensure_ascii=False, indent=2)
    print(f'Демо-данные в {a.out}: игроков {len(ply)}, FTD {len(truth)}, платежей {len(pay)}, бонусов {len(bon)}, строк активности {len(act)}')


if __name__ == '__main__':
    main()
