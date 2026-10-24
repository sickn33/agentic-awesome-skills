"""Пример выгрузки для оператора: python3 make_example.py <файл.xlsx> [--preview <файл.html>]

Книга из семи листов: "Инструкция" (какие листы нужны и где их взять), "Колонки" (что значит каждая колонка),
и пять листов данных в том виде, в каком их можно загрузить: "Депозиты", "Выводы", "Бонусы", "Ставки", "Игроки".
В данных 14 вымышленных игроков, каждый показывает один сценарий. Рядом пишется mapping-example.json для книги в этом формате.
--preview дополнительно пишет HTML с теми же листами (для картинки в README).
"""
import argparse
import datetime as dt
import html
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sd_xlsx import Sheet, write  # noqa: E402

D = dt.datetime
INDIGO, AMBER, GREY = '4E47FF', 'FFB800', '9AA3B5'

SHEETS = [
    ('Депозиты', 'обязательно', 'Все попытки депозита за 60-120 дней: успешные, отклоненные, брошенные.',
     'Отчет по платежам или транзакциям: тип Deposit, все статусы.',
     'FTD, второй депозит, Sum Dep, сценарий "Второй депозит не прошел", способ оплаты, который проходит в стране.'),
    ('Выводы', 'желательно', 'Запросы на вывод за тот же период.', 'Тот же отчет по транзакциям: тип Withdrawal.',
     'Сценарий "Выиграл и вывел".'),
    ('Бонусы', 'желательно', 'Начисленные бонусы с вейджером.', 'Отчет по бонусам.', 'Сценарий "Бонус с тяжелым вейджером".'),
    ('Ставки', 'желательно', 'Ставки и выигрыши реальными деньгами по игроку за день или за сессию.',
     'Отчет по игровой активности или GGR по игрокам с разбивкой по дням.', 'Сценарии "Сгорел быстро" и "Деньги на балансе".'),
    ('Игроки', 'желательно', 'Дата регистрации, страна, источник, флаги ответственной игры.', 'Список игроков.',
     'Точное определение FTD, срезы по стране и источнику, исключение самоисключенных и игроков с лимитами.'),
]
WHEN = [
    ('Первый запуск', 'Выгрузка за 60-120 дней по сегодняшний день. Скилл считает норму, недобор вторых депозитов и показатели по FTD старше 7 дней и сохраняет базу. Повторять раз в месяц.'),
    ('Каждый день', 'Выгрузка за последние 7 дней, у игроков дата первого депозита. Скилл собирает список на сегодня по FTD за 72 часа: кому писать сейчас и что предложить, файл на каждое действие для CRM. Способы оплаты и история причин берутся из базы. Запуск можно поставить по расписанию: выгрузки кладутся в одну папку, скилл берет самую свежую.'),
    ('Контрольная группа', '20% списка не получают сообщений 7 дней (сервисные случаи всегда получают помощь). Скилл ведет журнал и показывает, на сколько чаще возвращаются те, кому писали.'),
]
SIGNALS = [
    ('Много отказов подряд', 'Сразу после третьего отказа за 30 минут. Сейчас личное сообщение или звонок саппорта.'),
    ('Второй депозит не прошел', 'Сразу после отказа в кассе. В течение 15 минут другой способ оплаты.'),
    ('Вывод отклонен', 'В момент отказа по выводу. Сразу саппорт: причина и что сделать.'),
    ('Запросили документы', 'В момент запроса проверки. Помочь пройти проверку.'),
    ('Отыграл бонус и вывел', 'В момент запроса вывода. Новых депозитных бонусов не давать.'),
    ('Долгий вывод', 'Через 24 часа после запроса, если вывод не выплачен, или раньше, если закон страны требует быстрее (Бразилия 2 часа, Колумбия 12). Провести и сообщить срок.'),
    ('Выиграл и вывел', 'В момент запроса вывода. В обработке: провести быстро. Выплачен: через 2-3 дня повод вернуться.'),
    ('Бонус с тяжелым вейджером', 'В момент FTD. Отыгрывается: напомнить о прогрессе. Проигран: оффер без тяжелого вейджера.'),
    ('Сгорел быстро', 'В первую сессию. В течение 24 часов, без давления на депозит.'),
    ('Выиграл и не вывел', 'Через 24 часа после FTD. Поздравить и дать повод играть дальше.'),
    ('Деньги на балансе', 'Через 24 часа после FTD. Напомнить про баланс.'),
    ('FTD не с первой попытки', 'В момент FTD. Кнопка со способом, который прошел, в сообщении о втором депозите.'),
]
RULES = [
    ('Период', 'Первый запуск и раз в месяц: 60-120 дней по сегодняшний день. Каждый день: последние 7 дней с датой первого депозита у игроков.'),
    ('Все попытки', 'Депозиты нужны со всеми статусами, включая отклоненные и брошенные. Без них сценарий "Второй депозит не прошел" не посчитается.'),
    ('Без личных данных', 'Нужен только ID игрока, одинаковый во всех листах. Имена, email, телефоны и адреса не выгружайте.'),
    ('Свои названия', 'Колонки и статусы могут называться как угодно, листы могут лежать отдельными файлами CSV или XLSX. Скилл сопоставит их сам и спросит, если статус непонятен.'),
    ('Даты и время', 'Поддерживаемые форматы; неоднозначные даты и разделитель задайте явно. Время во всех файлах в одном часовом поясе, лучше UTC.'),
    ('Валюта', 'Если валют несколько, добавьте колонку валюты: скилл спросит курс к валюте отчета.'),
    ('Страна', 'Код страны игрока (BR, DE, GB) включает правила стран: законный срок выплаты, запрещенные способы оплаты, законные лимиты депозитов.'),
    ('Google Таблицы', 'Файл, Скачать, Microsoft Excel (.xlsx): все листы попадут в один файл. По ссылке скилл таблицы не читает, чтобы данные игроков не были открыты всем, у кого есть ссылка.'),
    ('SQL для аналитика', 'Готовые запросы на каждый лист и минимальный вариант одним запросом: examples/export-queries.sql в папке скилла. Названия колонок в них те же, что здесь.'),
]
COLUMNS = [
    ('Депозиты', 'player_id', 'да', 'ID игрока', '100231', 'Связывает все листы'),
    ('Депозиты', 'created_at', 'да', 'дата и время попытки', '06.10.2026 19:05', 'FTD и окно второго депозита'),
    ('Депозиты', 'amount', 'да', 'сумма', '50,00', 'Sum Dep'),
    ('Депозиты', 'currency', 'если валют несколько', 'код валюты', 'EUR', 'Пересчет в одну валюту'),
    ('Депозиты', 'status', 'да', 'статус как в вашей системе', 'Approved, Declined, Cancelled by user', 'Отличает депозит от неудачной попытки'),
    ('Депозиты', 'method', 'желательно', 'способ оплаты', 'Card', 'Срез по способу оплаты и замена способа при отказе'),
    ('Депозиты', 'decline_reason', 'желательно', 'причина отказа, как ее пишет касса', 'Insufficient funds, Deposit limit reached',
     'Отказ по лимиту депозитов или блокировке гемблинга в банке: другой способ оплаты не предлагается'),
    ('Выводы', 'player_id', 'да', 'ID игрока', '100235', ''),
    ('Выводы', 'created_at', 'да', 'дата и время запроса', '09.10.2026 11:40', 'Вывод раньше второго депозита'),
    ('Выводы', 'amount', 'желательно', 'сумма', '180,00', 'Во сколько раз вывод больше депозита'),
    ('Выводы', 'currency', 'если валют несколько', 'код валюты', 'EUR', ''),
    ('Выводы', 'status', 'желательно', 'статус', 'Paid, Pending, Rejected', 'Вывод отклонен, в обработке или выплачен'),
    ('Выводы', 'processed_at', 'желательно', 'дата и время выплаты', '08.10.2026 22:10', 'Долгий вывод и выплачен ли он'),
    ('Бонусы', 'player_id', 'да', 'ID игрока', '100234', ''),
    ('Бонусы', 'issued_at', 'да', 'дата и время начисления', '08.10.2026 15:02', 'Бонус к первому депозиту'),
    ('Бонусы', 'bonus_name', 'да', 'название бонуса', 'Welcome 100% x40', 'Если колонки wager нет, вейджер берется из названия'),
    ('Бонусы', 'wager', 'желательно', 'вейджер числом', '40', 'Тяжелый вейджер: от x35'),
    ('Бонусы', 'amount', 'нет', 'сумма бонуса', '100,00', ''),
    ('Бонусы', 'status', 'желательно', 'итог бонуса', 'Active, Lost, Expired, Wagered', 'Бонус еще отыгрывается или уже нет'),
    ('Ставки', 'player_id', 'да', 'ID игрока', '100233', ''),
    ('Ставки', 'date', 'да', 'день или начало сессии', '07.10.2026', 'Первая сессия после FTD'),
    ('Ставки', 'bets', 'да', 'сумма ставок реальными деньгами', '60,00', 'Оборот'),
    ('Ставки', 'wins', 'да', 'сумма выигрышей', '41,60', 'Проигрыш = ставки минус выигрыши. Вместо wins можно GGR'),
    ('Ставки', 'rounds', 'нет', 'число спинов', '9', 'Средняя ставка относительно депозита'),
    ('Игроки', 'player_id', 'да', 'ID игрока', '100231', ''),
    ('Игроки', 'registered_at', 'желательно', 'дата и время регистрации', '06.10.2026 18:51', 'Точное определение FTD'),
    ('Игроки', 'country', 'желательно', 'код страны', 'CA', 'Срез по стране и способ оплаты, который в ней проходит'),
    ('Игроки', 'source', 'желательно', 'источник или аффилиат', 'Affiliate 1', 'Срез по источнику трафика'),
    ('Игроки', 'self_excluded', 'желательно', 'флаг: Yes или пусто', 'Yes', 'Исключение из расчета и списка'),
    ('Игроки', 'deposit_limit', 'желательно', 'флаг: Yes или пусто', '', 'Исключение из расчета и списка'),
    ('Игроки', 'kyc_requested_at', 'желательно', 'когда запросили документы', '11.10.2026 09:30', 'Причина "Запросили документы"'),
    ('Игроки', 'first_deposit_at', 'для ежедневной выгрузки', 'дата и время первого депозита', '06.10.2026 19:05', 'Отличить FTD от старых игроков в короткой выгрузке'),
]
WHO = [
    ('100231', 'Обычный игрок: FTD 50 €, через два дня второй депозит, потом третий.'),
    ('100232', 'Второй депозит не прошел: две попытки картой отклонены, игрок ушел.'),
    ('100233', 'Сгорел быстро: поставил 60 € с депозита 20 € крупными спинами и проиграл 92%.'),
    ('100234', 'Бонус с тяжелым вейджером: к FTD 100 € взял Welcome 100% x40.'),
    ('100235', 'Выиграл и вывел: внес 50 €, на следующий день вывел 180 €.'),
    ('100236', 'Деньги на балансе: внес 100 €, поставил 15 € и пропал.'),
    ('100237', 'Самоисключение: не попадет ни в расчет, ни в список.'),
    ('100238', 'FTD не с первой попытки: бросил оплату картой, внес другим способом, потом вернулся.'),
    ('100239', 'Много отказов подряд: после FTD три отказа картой за 7 минут.'),
    ('100240', 'Вывод отклонен: запросил вывод 120 €, отказ.'),
    ('100241', 'Запросили документы: через 20 часов после FTD, второго депозита нет.'),
    ('100242', 'Отыграл бонус и вывел: взял Welcome 100% x40, вывел 260 €.'),
    ('100243', 'Долгий вывод: запрос 11.10, выплата через 52 часа.'),
    ('100244', 'Выиграл и не вывел: внес 50 €, выиграл 95 € и пропал.'),
]
DEPOSITS = [
    (100231, D(2026, 10, 6, 19, 5), 50, 'Approved', 'Card', ''),
    (100231, D(2026, 10, 8, 21, 14), 50, 'Approved', 'Card', ''),
    (100231, D(2026, 10, 11, 20, 2), 75, 'Approved', 'Card', ''),
    (100232, D(2026, 10, 7, 12, 30), 30, 'Approved', 'Card', ''),
    (100232, D(2026, 10, 7, 18, 47), 30, 'Declined', 'Card', 'Insufficient funds'),
    (100232, D(2026, 10, 7, 18, 49), 30, 'Declined', 'Card', 'Do not honor'),
    (100233, D(2026, 10, 7, 22, 10), 20, 'Approved', 'E-wallet', ''),
    (100234, D(2026, 10, 8, 15, 0), 100, 'Approved', 'Bank transfer', ''),
    (100235, D(2026, 10, 8, 17, 25), 50, 'Approved', 'Crypto', ''),
    (100236, D(2026, 10, 9, 10, 15), 100, 'Approved', 'Card', ''),
    (100237, D(2026, 10, 9, 23, 40), 20, 'Approved', 'Card', ''),
    (100238, D(2026, 10, 10, 13, 2), 25, 'Cancelled by user', 'Card', ''),
    (100238, D(2026, 10, 10, 13, 6), 25, 'Approved', 'E-wallet', ''),
    (100238, D(2026, 10, 12, 19, 30), 40, 'Approved', 'E-wallet', ''),
    (100239, D(2026, 10, 11, 14, 0), 50, 'Approved', 'Card', ''),
    (100239, D(2026, 10, 11, 20, 10), 50, 'Declined', 'Card', '3DS failed'),
    (100239, D(2026, 10, 11, 20, 13), 50, 'Declined', 'Card', 'Do not honor'),
    (100239, D(2026, 10, 11, 20, 17), 30, 'Declined', 'Card', 'Insufficient funds'),
    (100240, D(2026, 10, 11, 16, 20), 40, 'Approved', 'Crypto', ''),
    (100241, D(2026, 10, 11, 12, 45), 100, 'Approved', 'Bank transfer', ''),
    (100242, D(2026, 10, 10, 21, 0), 100, 'Approved', 'Card', ''),
    (100243, D(2026, 10, 10, 18, 30), 50, 'Approved', 'E-wallet', ''),
    (100244, D(2026, 10, 12, 11, 5), 50, 'Approved', 'Card', ''),
]
WITHDRAWALS = [
    (100235, D(2026, 10, 9, 11, 40), 180, 'Paid', D(2026, 10, 9, 15, 5)),
    (100240, D(2026, 10, 12, 9, 15), 120, 'Rejected', None),
    (100242, D(2026, 10, 11, 18, 40), 260, 'Paid', D(2026, 10, 11, 23, 0)),
    (100243, D(2026, 10, 11, 10, 0), 150, 'Paid', D(2026, 10, 13, 14, 0)),
]
BONUSES = [
    (100234, D(2026, 10, 8, 15, 2), 'Welcome 100% x40', 40, 100, 'Lost'),
    (100231, D(2026, 10, 8, 21, 15), 'Reload 50% x35', 35, 25, 'Wagered'),
    (100238, D(2026, 10, 12, 19, 31), 'Weekly 30 FS x10', 10, 3, 'Lost'),
    (100242, D(2026, 10, 10, 21, 2), 'Welcome 100% x40', 40, 100, 'Wagered'),
]
BETS = [
    (100231, D(2026, 10, 6), 900, 870, 150), (100231, D(2026, 10, 8), 1100, 1065, 180),
    (100232, D(2026, 10, 7), 410, 381, 160), (100233, D(2026, 10, 7), 60, 41.6, 9),
    (100234, D(2026, 10, 8), 2400, 2310, 600), (100235, D(2026, 10, 8), 500, 680, 250),
    (100236, D(2026, 10, 9), 15, 12, 30), (100237, D(2026, 10, 9), 200, 185, 100),
    (100238, D(2026, 10, 10), 300, 290, 120), (100238, D(2026, 10, 12), 500, 470, 200),
    (100239, D(2026, 10, 11), 700, 655, 300), (100240, D(2026, 10, 11), 600, 690, 280),
    (100241, D(2026, 10, 11), 1500, 1420, 500), (100242, D(2026, 10, 10), 4200, 4310, 1400),
    (100243, D(2026, 10, 10), 800, 900, 320), (100244, D(2026, 10, 12), 400, 495, 160),
]
PLAYERS = [
    (100231, D(2026, 10, 6, 18, 51), 'CA', 'Affiliate 1', '', ''),
    (100232, D(2026, 10, 7, 12, 2), 'BR', 'SEO', '', ''),
    (100233, D(2026, 10, 7, 21, 55), 'MX', 'Paid social', '', ''),
    (100234, D(2026, 10, 8, 14, 41), 'FI', 'Affiliate 2', '', ''),
    (100235, D(2026, 10, 8, 17, 3), 'NZ', 'Referral', '', ''),
    (100236, D(2026, 10, 9, 9, 58), 'JP', 'Affiliate 1', '', ''),
    (100237, D(2026, 10, 9, 23, 31), 'CL', 'Affiliate 3', 'Yes', ''),
    (100238, D(2026, 10, 10, 12, 47), 'PE', 'SEO', '', ''),
    (100239, D(2026, 10, 11, 13, 40), 'BR', 'Affiliate 2', '', ''),
    (100240, D(2026, 10, 11, 16, 1), 'CA', 'Affiliate 1', '', ''),
    (100241, D(2026, 10, 11, 12, 20), 'FI', 'SEO', '', ''),
    (100242, D(2026, 10, 10, 20, 41), 'MX', 'Affiliate 2', '', ''),
    (100243, D(2026, 10, 10, 18, 2), 'NZ', 'Referral', '', ''),
    (100244, D(2026, 10, 12, 10, 49), 'JP', 'Paid social', '', ''),
]
HEADERS = {
    'Депозиты': ['player_id', 'created_at', 'amount', 'currency', 'status', 'method', 'decline_reason'],
    'Выводы': ['player_id', 'created_at', 'amount', 'currency', 'status', 'processed_at'],
    'Бонусы': ['player_id', 'issued_at', 'bonus_name', 'wager', 'amount', 'status'],
    'Ставки': ['player_id', 'date', 'bets', 'wins', 'rounds'],
    'Игроки': ['player_id', 'registered_at', 'country', 'source', 'self_excluded', 'deposit_limit', 'kyc_requested_at', 'first_deposit_at'],
}


def template_mapping(path):
    """mapping.json для книги в формате примера: те же листы и колонки."""
    return {
        'currency': 'EUR',
        'files': {
            'deposits': {'path': path, 'sheet': 'Депозиты',
                         'columns': {'player_id': 'player_id', 'time': 'created_at', 'amount': 'amount', 'currency': 'currency',
                                     'status': 'status', 'method': 'method', 'reason': 'decline_reason'},
                         'status': {'success': ['Approved'], 'declined': ['Declined', 'Error'], 'abandoned': ['Cancelled by user'],
                                    'pending': ['Pending']},
                         'decline_reasons': {'limit': ['Deposit limit reached'], 'block': ['Gambling blocked by bank']}},
            'withdrawals': {'path': path, 'sheet': 'Выводы',
                            'columns': {'player_id': 'player_id', 'time': 'created_at', 'amount': 'amount', 'currency': 'currency', 'status': 'status',
                                        'done_time': 'processed_at'},
                            'status': {'success': ['Paid'], 'pending': ['Pending'], 'declined': ['Rejected']}},
            'bonuses': {'path': path, 'sheet': 'Бонусы',
                        'columns': {'player_id': 'player_id', 'time': 'issued_at', 'name': 'bonus_name', 'wager': 'wager', 'amount': 'amount',
                                    'status': 'status'},
                        'status': {'active': ['Active'], 'lost': ['Lost'], 'expired': ['Expired'], 'completed': ['Wagered'], 'cancelled': ['Cancelled']}},
            'bets': {'path': path, 'sheet': 'Ставки',
                     'columns': {'player_id': 'player_id', 'time': 'date', 'bets': 'bets', 'wins': 'wins', 'rounds': 'rounds'}},
            'players': {'path': path, 'sheet': 'Игроки',
                        'columns': {'player_id': 'player_id', 'reg_time': 'registered_at', 'country': 'country', 'source': 'source',
                                    'kyc_time': 'kyc_requested_at', 'ftd_time': 'first_deposit_at'},
                        'rg_flags': ['self_excluded', 'deposit_limit']},
        },
    }


def csv_mapping():
    """mapping.json для CSV из export-queries.sql: файл на лист, самый свежий по маске (для ежедневных выгрузок в одной папке)."""
    m = template_mapping('')
    for name, spec in m['files'].items():
        spec.pop('sheet', None)
        spec['path'] = f'{name}*.csv'
        spec['latest'] = True
    return m


def one_file_mapping():
    """mapping.json для минимума одним запросом (запрос 6 в export-queries.sql): депозиты и выводы с данными игрока в строке."""
    dep = template_mapping('')['files']['deposits']
    return {
        'currency': 'EUR',
        'files': {
            'transactions': {'path': 'one-file*.csv', 'latest': True,
                             'columns': {'player_id': 'player_id', 'time': 'created_at', 'type': 'type', 'amount': 'amount', 'currency': 'currency',
                                         'status': 'status', 'method': 'method', 'reason': 'decline_reason', 'done_time': 'processed_at',
                                         'country': 'country'},
                             'type': {'deposit': ['Deposit'], 'withdrawal': ['Withdrawal']},
                             'status': {'success': ['Approved', 'Paid'], 'declined': ['Declined', 'Error', 'Rejected'],
                                        'abandoned': ['Cancelled by user'], 'pending': ['Pending']},
                             'decline_reasons': dep['decline_reasons']},
            'players': {'path': 'one-file*.csv', 'latest': True,
                        'columns': {'player_id': 'player_id', 'reg_time': 'registered_at', 'country': 'country', 'source': 'source',
                                    'kyc_time': 'kyc_requested_at', 'ftd_time': 'first_deposit_at'},
                        'rg_flags': ['self_excluded', 'deposit_limit']},
        },
    }


def data_sheet(name, rows, widths, tab):
    sh = Sheet(name, widths=widths, tab=tab)
    sh.row(*[(h, 'header') for h in HEADERS[name]], height=20)
    for r in rows:
        sh.row(*r)
    return sh


def build():
    ins = Sheet('Инструкция', widths=[30, 100], tab=AMBER, freeze=False)
    ins.row(('Пример выгрузки для скилла second-deposit', 'title'), height=26, merge=2)
    ins.row(('Файл показывает, какие данные нужны. Его можно заполнить и загрузить как есть, но не обязательно: подойдут ваши выгрузки '
             'из бэк-офиса как есть, с любыми названиями колонок, CSV или XLSX. Скилл сопоставит колонки сам. Данные ниже вымышлены.', 'note'),
            height=48, merge=2)
    ins.row()
    ins.row(('Ограничения', 'label'), ('Описательные гипотезы, не причины и не доказанный эффект. Правила стран — непроверенный снимок; подтвердите применимость. Список контактов по умолчанию отключен: нужны проверка возраста, согласия, RG и явное включение оператором.', 'wrap'), height=64)
    ins.row(('Когда смотреть', 'section'), ('', 'section'), height=20)
    for label, text in WHEN:
        ins.row((label, 'chip' if label == 'Свежие FTD' else 'label'), (text, 'wrap'), height=48 if len(text) > 120 else 32)
    ins.row()
    ins.row(('Когда виден сигнал', 'section'), ('', 'section'), height=20)
    for label, text in SIGNALS:
        ins.row((label, 'label'), (text, 'wrap'), height=18)
    ins.row()
    ins.row(('Какие листы нужны', 'section'), ('', 'section'), height=20)
    low = lambda x: x[0].lower() + x[1:] if len(x) > 1 and x[1].islower() else x  # после двоеточия со строчной, FTD не трогаем
    for name, need, what, where, gives in SHEETS:
        where, gives = low(where), low(gives)
        ins.row((f'{name} ({need})', 'chip' if need == 'обязательно' else 'label'),
                (f'{what}\nГде взять: {where}\nЧто дает: {gives}', 'wrap'), height=64)
    ins.row()
    ins.row(('Правила', 'section'), ('', 'section'), height=20)
    for label, text in RULES:
        ins.row((label, 'label'), (text, 'wrap'), height=32)
    ins.row()
    ins.row(('Кто есть кто в примере', 'section'), ('', 'section'), height=20)
    for pid, text in WHO:
        ins.row((pid, 'label'), (text, 'wrap'), height=18)
    ins.row()
    ins.row(('Описание каждой колонки на листе "Колонки". Отчет и список игроков скилл соберет сам.', 'note'), height=18, merge=2)

    cols = Sheet('Колонки', widths=[12, 16, 20, 30, 34, 52], tab=AMBER)
    cols.row(*[(h, 'header') for h in ('Лист', 'Колонка', 'Нужна', 'Формат', 'Пример', 'Зачем')], height=20)
    for sheet, col, need, fmt, ex, why in COLUMNS:
        cols.row((sheet, 'wrap'), (col, 'label'), (need, 'chip' if need == 'да' else 'wrap'), (fmt, 'wrap'), (ex, 'wrap'), (why, 'wrap'))

    dep = data_sheet('Депозиты', [(p, (t, 'datetime'), (a, 'money'), 'EUR', s, m, why) for p, t, a, s, m, why in DEPOSITS],
                     [12, 18, 11, 10, 18, 15, 22], INDIGO)
    wd = data_sheet('Выводы', [(p, (t, 'datetime'), (a, 'money'), 'EUR', s, (d, 'datetime') if d else '') for p, t, a, s, d in WITHDRAWALS],
                    [12, 18, 11, 10, 12, 18], GREY)
    bon = data_sheet('Бонусы', [(p, (t, 'datetime'), n, (w, 'int'), (a, 'money'), st) for p, t, n, w, a, st in BONUSES], [12, 18, 22, 9, 11, 12], GREY)
    bets = data_sheet('Ставки', [(p, (t, 'date'), (b, 'money'), (w, 'money'), (r, 'int')) for p, t, b, w, r in BETS], [12, 13, 11, 11, 9], GREY)
    kyc = {100241: D(2026, 10, 12, 8, 50)}
    ftd = {}
    for p_, t_, a_, st_, m_, _ in DEPOSITS:
        if st_ == 'Approved':
            ftd.setdefault(p_, t_)
    ply = data_sheet('Игроки', [(p, (t, 'datetime'), c, s, x, lim, (kyc[p], 'datetime') if p in kyc else '', (ftd[p], 'datetime') if p in ftd else '')
                                for p, t, c, s, x, lim in PLAYERS], [12, 18, 10, 14, 15, 15, 18, 18], GREY)
    return [ins, cols, dep, wd, bon, bets, ply]


def preview(sheets, path):
    """HTML с теми же листами: вкладки и сетка как в таблице, для картинки в README."""
    def cell_text(v):
        v = v[0] if isinstance(v, tuple) else v
        if isinstance(v, dt.datetime):
            return v.strftime('%d.%m.%Y') if v.time() == dt.time() else v.strftime('%d.%m.%Y %H:%M')
        if isinstance(v, float) or (isinstance(v, int) and not str(v).startswith('100')):
            return f'{v:,.2f}'.replace(',', ' ').replace('.', ',') if not isinstance(v, int) or v > 99 or True else str(v)
        return '' if v is None else str(v)
    css = """body{margin:0;background:#E9EDF2;font:13px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#12142B}
.book{margin:24px;background:#fff;border:1px solid #CBD3DD;border-radius:10px;overflow:hidden;box-shadow:0 10px 30px rgba(18,20,43,.12)}
.bar{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#F6F8FB;border-bottom:1px solid #DDE3EA;font-weight:600}
.bar i{width:12px;height:12px;border-radius:50%;background:#E3E8EF;display:inline-block}
table{border-collapse:collapse;table-layout:fixed}
th.c,td.r{background:#F3F5F8;color:#7A8394;font-weight:500;text-align:center;border:1px solid #E3E8EF;font-size:11.5px}
td{border:1px solid #E3E8EF;padding:5px 7px;vertical-align:top;white-space:pre-wrap;overflow:hidden}
td.header{background:#4E47FF;color:#fff;font-weight:700}
td.title{font-size:18px;font-weight:800}
td.note{color:#5B6478;font-style:italic}
td.section{background:#ECEBFF;font-weight:700}
td.label{font-weight:700}
td.chip{background:#FFF4D6;font-weight:700}
td.num{text-align:right;font-variant-numeric:tabular-nums}
.tabs{display:flex;gap:2px;padding:0 10px 10px;background:#F6F8FB;border-top:1px solid #DDE3EA}
.tab{padding:7px 14px;border-radius:0 0 8px 8px;background:#E9EDF2;color:#5B6478;font-weight:600;border-top:3px solid transparent}
.tab.on{background:#fff;color:#12142B}"""
    out = [f'<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>{css}</style></head><body>']
    for k, sh in enumerate(sheets):
        out.append(f'<div class="book" id="s{k}"><div class="bar"><i></i><i></i><i></i><span>export-example.xlsx</span></div><table>')
        widths = sh.widths or [12] * 6
        out.append('<tr><th class="c" style="width:34px"></th>' + ''.join(f'<th class="c" style="width:{w * 7.4:.0f}px">{chr(65 + i)}</th>' for i, w in enumerate(widths)) + '</tr>')
        merged = {int(m.split(':')[0][1:]): ord(m.split(':')[1][0]) - 64 for m in sh.merges}
        for ri, (cells, height) in enumerate(sh.rows, 1):
            tds = []
            span = merged.get(ri)
            for ci in range(len(widths)):
                if span and 0 < ci < span:
                    continue
                cell = cells[ci] if ci < len(cells) else ''
                style = cell[1] if isinstance(cell, tuple) else ''
                value = cell[0] if isinstance(cell, tuple) else cell
                cls = style or ''
                if isinstance(value, (int, float)) and not isinstance(value, bool) and ci > 0:
                    cls += ' num'
                    text = (f'{value:,.2f}'.replace(',', ' ').replace('.', ',') if style == 'money' else str(value))
                else:
                    text = cell_text(cell)
                attr = f' colspan="{span}"' if span and ci == 0 else ''
                tds.append(f'<td class="{cls}"{attr}>{html.escape(text)}</td>')
            out.append(f'<tr><td class="r">{ri}</td>' + ''.join(tds) + '</tr>')
        out.append('</table><div class="tabs">' + ''.join(
            f'<span class="tab{" on" if j == k else ""}" style="border-top-color:#{s.tab or "E3E8EF"}">{html.escape(s.name)}</span>' for j, s in enumerate(sheets)) + '</div></div>')
    out.append('</body></html>')
    open(path, 'w', encoding='utf-8').write(''.join(out))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--preview')
    a = ap.parse_args()
    folder = os.path.dirname(os.path.abspath(a.out))
    targets = [a.out, *(os.path.join(folder, n) for n in ('mapping-example.json', 'mapping-csv-example.json', 'mapping-one-file-example.json'))]
    if a.preview:
        targets.append(a.preview)
    if any(os.path.exists(t) for t in targets):
        ap.error('use new output paths; existing files will not be overwritten')
    sheets = build()
    write(a.out, sheets)
    folder = os.path.dirname(os.path.abspath(a.out))
    for name, mapping in (('mapping-example.json', template_mapping(os.path.basename(a.out))),
                          ('mapping-csv-example.json', csv_mapping()), ('mapping-one-file-example.json', one_file_mapping())):
        with open(os.path.join(folder, name), 'w', encoding='utf-8') as f:
            json.dump(mapping, f, ensure_ascii=False, indent=2)
    if a.preview:
        preview(sheets, a.preview)
    print(f'Пример выгрузки: {a.out} ({", ".join(s.name for s in sheets)})')


if __name__ == '__main__':
    main()
