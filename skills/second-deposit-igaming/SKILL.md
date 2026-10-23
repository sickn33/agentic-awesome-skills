---
name: second-deposit-igaming
description: "Explore local casino deposit exports with heuristic signals and descriptive comparisons. Sensitive player data; contact lists and country-rule use require separate operator verification."
category: business
risk: critical
source: community
source_repo: igamingsychov/second-deposit-igaming
source_type: community
date_added: "2026-10-21"
author: "Yevhen Sychov"
tags: [igaming, crm, retention, analytics, csv, xlsx, python]
tools: [claude]
license: "MIT"
license_source: "https://github.com/igamingsychov/second-deposit-igaming/blob/main/LICENSE"
---

# second-deposit-igaming: why first-time depositors skip the second deposit

For industry professionals (casino CRM, retention, product and analytics teams). 21+. Not gambling advertising.

## Overview

A Claude Code skill that reads casino back-office exports (deposits with all attempts; optionally withdrawals, bonuses, bets and players) as CSV or XLSX with any column names. It assigns every first-time depositor (FTD) one of 12 heuristic signals for not making a second deposit, estimates missed second deposits and Sum Dep per reason against a norm of similar players, computes 24 metrics, shows exploratory segments selected by an uncorrected heuristic z score and builds a list of recent FTDs for CRM with an action that depends on the player's state and country rules. Calculations run in local Python scripts (python3 3.9 or newer, standard library only). The inspector suppresses raw cell values; file/sheet/column names and small aggregates may still identify people. Review output locally before sharing.

Source repository: https://github.com/igamingsychov/second-deposit-igaming (MIT, author Yevhen Sychov). The detailed instructions after the English sections are the Russian skill text with local review corrections. Support files used by the instructions: `scripts/`, `references/`, `examples/`.

## When to Use

- The user asks why FTDs do not come back, asks about the second deposit, STD or FTD to STD, or asks to analyze casino deposits.
- The user provides deposit exports (CSV or XLSX) or wants a daily list of recent FTDs without a second deposit for CRM.
- The user does not know what to export: the skill points to the sample workbook and the SQL queries in `examples/`.
- Original trigger phrases: "второй депозит", "STD", "почему FTD не возвращаются", "разбери депозиты", "second deposit", "FTD to STD", "/second-deposit".

## Examples

```text
show the second-deposit skill demo
why don't our FTDs come back? exports are in ~/Downloads/exports
build today's FTD list from the fresh export
```

## Limitations

- No market benchmarks. Without history the reasons, actions and country rules work from day one, while the norm, forecast and money appear from day 8, once 50 FTDs are older than 7 days. A 60-120 day export gives the full calculation at once.
- The number of reasons depends on the files: deposits with all attempts are the minimum, and one query with deposits and withdrawals covers 7 of 12 reasons.
- A reason shows where players are lost, it does not prove the cause. The saved hash-based group assignment alone does not establish delivery or a causal effect; validate experiment design, adherence, contamination, power and uncertainty.
- Google Sheets links are not opened: the user downloads the workbook as XLSX.
- Country rules (legal payout deadlines, payment methods banned in the country, legal deposit limits) cover the countries listed in `references/geo_rules.md`, state as of 18.10.2026, an unverified snapshot with some secondary links. Country rules are disabled by default; verify current primary sources and applicability before --verified-country-rules.
- Players with responsible gambling flags are excluded from the calculation and the list. Local contact lists are withheld by default; --confirmed-contact-eligibility additionally requires mapped RG flags. An operator must verify every candidate’s age, consent, restrictions and harm indicators before opting in.

## Security & Safety Notes

- Privacy: the model must not read export rows directly. Local Python reads the files. Column mapping uses only the output of `scripts/sd_inspect.py`, which suppresses raw cell values but does not certify anonymity. Player lists are written to files and are not opened in the chat.
- No uploads, web services or external APIs. Scripts write results to `<folder>/second-deposit/`.
- The optional daily schedule adds a crontab line (or a Windows scheduled task) only after explicit user consent, because it is a persistent change to the user's computer.

## Review boundaries

The monetary “min/max” values are two descriptive calculations, not statistical confidence bounds, recoverable revenue or a proven upper bound. Signals can use post-outcome information and overlap in priority order. A threshold of 50 or 300 FTDs does not guarantee reliability. Validate export coverage, duplicates, currencies, time zones, observation windows and profile compatibility; use a separate output folder per project.

No messages are sent. Default analysis withholds contact lists and country rules. Only a responsible operator who has checked current per-player age, consent, exclusion/limits/harm status and jurisdiction may enable `--confirmed-contact-eligibility` with mapped RG fields. Enable `--verified-country-rules` only after reviewing current primary rules for the exact licence and territory. A listed method is a reference filter, never legal approval. Do not use rapid losses to recommend games, stakes or bonuses.

Output files overwrite prior results in the chosen dedicated folder. Back up profiles/logs; restrict access and retention. Exported CSV cells that look like formulas receive a leading apostrophe; prefer XLSX for viewing and verify IDs before a CRM import. Never open the internal rescue log in a spreadsheet as an export.

## Original instructions

The text below includes local safety and correctness amendments.

# Второй депозит

Скилл отвечает на вопрос "почему FTD не возвращаются и сколько это стоит". Считает код, модель только сопоставляет колонки и пересказывает итоги. Скрипты локальны, но вывод и summary.json содержат названия и малые агрегаты, которые могут идентифицировать человека. Перед передачей модели нужна локальная проверка; не обещай анонимность.

Папка скилла: та, где лежит этот файл (обычно `~/.claude/skills/second-deposit`). Нужен только `python3` (3.9 и новее), сторонние библиотеки не нужны.

## Правила приватности (строго)

1. Не открывай выгрузки и не читай их строки: ни Read, ни cat, ни head. Все, что нужно для сопоставления, печатает `sd_inspect.py`, он не печатает исходные значения, но названия файлов/листов/колонок тоже могут быть чувствительными. Статусы сверяет оператор локально.
2. Не открывай `rescue_list.csv`, `excluded_rg.csv` и файлы в папке `lists`, в них ID игроков. summary.json, profile.json, rescue_log.csv и daily.log тоже чувствительны: не открывай их модели без локальной проверки/редактирования пользователем. Пересказывай только проверенные безопасные агрегаты.
3. Не отправляй данные никуда: никаких загрузок, веб-сервисов и внешних API.
4. Если пользователь сам вставил строки с данными игроков в чат, не повторяй их в ответе.

## Как скилл учится под проект

- **Есть история.** Полный запуск по выгрузке за 60-120 дней собирает профиль проекта `profile.json`: второй депозит за 24 часа, 72 часа, 7 и 30 дней, кривые возврата по каждой причине и у нормы, норма похожих игроков, додепы (сумма второго депозита, второй к первому, депозитов у вернувшегося, Sum Dep), апрув по странам и способам оплаты, время выплаты. Ежедневные запуски берут вводные из профиля и считают прогноз по списку на сегодня. Профиль обновляется каждым полным запуском.
- **Истории нет.** Публичного бенчмарка второго депозита нет: открытых цифр с методикой не нашлось ни по одной стране, поэтому скилл не подставляет чужие цифры. Причины, действия и правила стран работают с первого дня. Норма, прогноз и деньги появляются с 8-го дня: когда у первых FTD пройдет 7 дней и таких FTD наберется 50, скрипт сам перейдет на полный расчет и сохранит профиль. Если пользователь просит ориентиры или нормы рынка, скажи именно это и не называй цифр.
- **Правила стран** (`references/geo_rules.json`, описание и официальные источники в `geo_rules.md`): порог долгого вывода по законному сроку страны, если он короче 24 часов (Бразилия 2 часа, Колумбия 12); запрещенные в стране способы оплаты не подсказываются; при отказе по лимиту депозитов другой способ не предлагается, действие "объяснить лимит"; игрок с блокировкой гемблинга в банке исключается, как флаг ответственной игры. Чтобы фильтр способов работал точно, добавь в `mapping.json` поле `method_types`: каждому способу оплаты из выгрузки тип `card`, `credit_card`, `instant_bank`, `online_banking`, `ewallet`, `voucher_cash`, `mobile_money` или `crypto` (без него тип угадывается по названию). Если страны в выгрузке нет, а проект работает в одной стране, запускай с `--country BR`.

## Два режима

- **Полный** (первый запуск, потом раз в месяц): выгрузка за 60-120 дней. Причины, недобор вторых депозитов и Sum Dep (вилка от и до) против нормы похожих игроков, показатели, срезы, список. Сохраняет профиль проекта `profile.json`.
- **Список** (каждый день): выгрузка за последние 7 дней с датой первого депозита у игроков. Причины и список на сегодня; способы оплаты, история причин и прогноз из профиля. Скрипт сам выбирает режим: если FTD старше 7 дней меньше 50, это режим списка.
- Обе выгрузки кладутся в одну рабочую папку проекта, результат всегда в `<папка>/second-deposit`: там живут профиль и журнал `rescue_log.csv`. Не меняй папку результата между запусками, иначе пропадут профиль и журнал.
- С `"latest": true` у файлов в `mapping.json` и маской в `path` (`deposits*.csv`) скрипт берет самую свежую выгрузку по времени изменения: ежедневные файлы копятся в одной папке, а раз в месяц туда же кладется выгрузка за 60-120 дней, и профиль пересчитывается сам.
- В списке 20% игроков (без сервисных случаев) уходят в контрольную группу: им не пишут 7 дней. Журнал копит, кто вернулся, и отчет показывает эффект действий против контрольной группы, когда у игроков пройдет 7 дней.

## Порядок работы

1. **Найди выгрузки.** Спроси папку, если пользователь ее не назвал.
   - Человек не знает, что выгружать: дай путь к `examples/export-example.xlsx` (листы "Инструкция" и "Колонки" объясняют, что и откуда брать) и скажи коротко: в первый раз депозиты со всеми попытками за 60-120 дней, желательно выводы, бонусы, ставки по дням и список игроков; дальше каждый день то же за последние 7 дней, у игроков дата первого депозита; названия колонок могут быть свои.
   - Выгрузки делает аналитик или администратор базы: дай `examples/export-queries.sql`. В нем запрос на каждый файл с теми же названиями колонок, что в примере, и минимум одним запросом (депозиты и выводы с данными игрока в строке, 7 из 12 причин). Для таких CSV готовы `examples/mapping-csv-example.json` и `examples/mapping-one-file-example.json`.
   - Данные в Google Таблицах: не открывай ссылку и не скачивай по ней. Попроси пользователя скачать книгу: Файл, Скачать, Microsoft Excel (.xlsx), все листы попадут в один файл, и положить его в папку. Ссылка, которая открывается без входа в аккаунт, видна любому, у кого она есть, поэтому для данных игроков не подходит.
   - Выгрузок нет, но хочется посмотреть: `python3 scripts/make_demo.py <папка>/demo --xlsx` создаст вымышленную книгу `export.xlsx` в формате примера и готовый `mapping.json`, переходи к шагу 4.
2. **Посмотри структуру:** `python3 scripts/sd_inspect.py <папка или файлы>`.
3. **Собери `mapping.json`** в папке с выгрузками.
   - Книга в формате примера (листы "Депозиты", "Выводы", "Бонусы", "Ставки", "Игроки" с теми же колонками): скопируй `examples/mapping-example.json`, поменяй `path` на имя файла и сверь статусы с обзором.
   - CSV по `export-queries.sql`: скопируй `mapping-csv-example.json` (файл на лист) или `mapping-one-file-example.json` (один файл) и сверь статусы с обзором. В них уже маски и `"latest": true` для ежедневных выгрузок.
   - Свои выгрузки: собери по образцу из `references/data.md`. Сопоставь колонки с полями (`player_id`, `time`, `amount`, `status` и т.д.), разнеси каждое значение статуса и типа операции, флаги ответственной игры (самоисключение, лимиты, тайм-аут, признаки риска) перечисли в `players.rg_flags`, укажи валюту отчета, `fx`, `dayfirst`, `decimal`, `tz`, если обзор показал такой формат.
   - Статусы депозитов: `success` только успешный; `declined` отказ банка, провайдера или ошибка; `abandoned` игрок отменил, бросил или оплата истекла; `cancelled` для депозита тоже неудачная попытка; `pending` не учитывается. Статусы выводов: `declined` — отклонен, `cancelled`/`abandoned` — отменен, `pending` — запрос в обработке, `success` — выплачен.
   - Причина отказа у депозитов: если обзор показал такую колонку, сопоставь ее как `reason` и разнеси в `decline_reasons`: в `limit` только значения про лимит депозитов (лимит игрока или законный), в `block` только значения, где прямо сказано, что гемблинг заблокирован банком или самим игроком. Общие отказы банка ("Do not honor", "Insufficient funds", ошибки 3DS) не трогай: это обычный отказ, ему подсказывается другой способ оплаты.
   - Колонки с именами, email, телефонами, адресами никогда не сопоставляй. Если обзор их показал, скажи пользователю, что они не нужны и в следующий раз их лучше не выгружать.
   Спрашивай пользователя только о том, что нельзя понять из обзора: значение непонятного статуса, неоднозначный порядок дня и месяца, курсы валют, часовой пояс файлов без пояса, если в других файлах время с поясом (`Z`, `+03:00`), и реальные ли деньги в ставках, если по названию колонки это неясно. Задавай все вопросы одним сообщением.
4. **Проверь готовность:** `python3 scripts/sd_analyze.py --mapping <папка>/mapping.json --out <папка>/second-deposit --check`. Скрипт скажет, сколько причин из 12 посчитается и чего не хватает, какой будет режим (полный или список) и что проверить (страна, флаги ответственной игры, типы способов оплаты). Перескажи это пользователю одним сообщением: если не хватает данных, которые легко добавить, предложи добавить их до расчета, иначе считай.
5. **Запусти расчет:** `python3 scripts/sd_analyze.py --mapping <папка>/mapping.json --out <папка>/second-deposit --lang ru` (язык ответа пользователя: `ru`, `uk` или `en`). Если скрипт остановился с ошибкой сопоставления, исправь `mapping.json` и запусти снова. Проверь две строки вывода: "Бонусы" (у каждого бонуса найден вейджер, тяжелые помечены верно) и "Попытки депозита по статусам" (неудачных попыток не ноль). Остальные параметры (окно второго депозита, порог тяжелого вейджера и другие) меняй, только если пользователь попросил: `python3 scripts/sd_analyze.py --help`.
6. **Прочитай `summary.json`** и ответь коротко:
   - STD за окно и норма (STD игроков без проблемных сигналов);
   - недобор Sum Dep в месяц вилкой: от `lost_month_min` (только сами вторые депозиты) до `lost_month` (Sum Dep вернувшегося за 30 дней), и три причины с самым большим недобором: сколько FTD, STD против нормы, вилка, что делать;
   - срезы из `segments`, если есть;
   - главные показатели из `metrics`: второй депозит за 24 часа и 7 дней, апрув кассы, доля выводов и отклоненных выводов, Sum Dep на одного FTD, динамика по неделям из `weekly`;
   - список: сколько игроков, по каким действиям (`rescue.actions`), на какой момент снят (последняя попытка депозита в выгрузке) и путь к папке `rescue.list_dir`: в ней `actions.csv` (сводка действий), файл на каждое действие для загрузки в CRM как сегмент, `rescue_list.xlsx` для чтения в Excel и копия отчета; в CRM при отправке исключать тех, у кого был депозит после `snapshot_utc`; действия с приоритетом 1 (много отказов подряд, отказ по лимиту, вывод отклонен или висит, документы) нужны сейчас;
   - правила стран из `geo_rules`: страны с правилами, что они изменили (`applied`: отказы по лимиту, исключенные из-за блокировки в банке, долгие выводы по законному сроку, выводы дольше законного срока), попытки депозита запрещенными в стране способами (`banned_in_data`), страны без правил;
   - оговорки из `caveats` простыми словами: чего не хватает в данных и что добавить в выгрузку.
   В режиме списка вместо денег и показателей скажи, сколько игроков в списке, сколько писать и сколько в контрольной группе, по каким причинам, прогноз из `forecast` (сколько вернутся без действий, сколько не хватает до нормы, вилка денег) и откуда вводные. Если профиля нет, скажи, что публичного бенчмарка нет, норма и прогноз появятся с 8-го дня, а сразу полный расчет даст выгрузка за 60-120 дней. Если в `summary.json` есть `effect`, назови разницу в долях вторых депозитов и вывод: описательная разница назначенных групп; z эвристический, доставка не подтверждена, причинный эффект и статистическая значимость не установлены.
   Дай путь к `report.html` (копия по дате лежит в папке списка). Остальные файлы в той же папке: `scenarios.csv` и `segments.csv` (таблицы для Excel, в `segments.csv` колонка `significant` означает только эвристический z ≥ 2 без поправки на множественные сравнения), `excluded_rg.csv` (кто исключен по ответственной игре). Все суммы и штуки в ответе бери месячные (`lost_month`, `gap_players_month`). Не придумывай рыночных норм и не сравнивай с "рынком": все цифры только из данных пользователя.
7. **Предложи следующий шаг:** загрузить файлы действий в CRM как сегменты (колонки `action_code`, `priority`, `send_after_utc`), включить триггеры по сценариям (`references/scenarios.md`, раздел "Триггеры"), поставить ежедневный запуск по расписанию (раздел ниже).

## Ежедневный запуск по расписанию

Скрипт не требует Claude: по расписанию его запускает планировщик системы. Ставь задачу только после явного согласия пользователя: это постоянная настройка его компьютера.

1. **Папка.** Одна папка для выгрузок и результата. На Mac не на Рабочем столе и не в Документах или Загрузках: туда планировщик без отдельного разрешения не пустит. Например `~/second-deposit-data`.
2. **mapping.json** с масками и `"latest": true` у каждого файла (как в `mapping-csv-example.json`). Проверь одним ручным запуском.
3. **Задача.** Полный путь к python3 покажет `which python3`. Mac и Linux, добавить строку к существующим, не стирая их:
   Создай проверенную задачу через редактор планировщика с отдельными полями executable/arguments; абсолютные пути заключай в корректные для ОС кавычки. Для cron сначала сохрани резервную копию текущего crontab, проверь существующую задачу, создай папку результата и отредактируй одну строку через `crontab -e`. Не вставляй пути/значения пользователя в shell-шаблон и не дублируй задачу. На Windows проверь quoting полного executable и каждого аргумента. Не добавляй флаги контактов или правил стран без отдельной проверки оператора.
   Время ставь после того, как выгрузка обычно появляется в папке.
4. **Скажи пользователю:** куда класть выгрузки (с датой в имени, например `deposits_2026-10-17.csv`), где каждое утро лежит результат (`second-deposit/lists/<дата>/`), что daily.log может содержать чувствительные названия и агрегаты, требует ограниченного доступа и ротации, и как убрать задачу: `crontab -e` и удалить строку, в Windows `schtasks /delete /tn second-deposit`.

## Как читать цифры

- **Две части по времени.** Список собирается по свежим FTD за последние 72 часа: сигналы видны в первые часы (отказ в кассе и отклоненный вывод сразу, запрос документов в момент запроса, тяжелый бонус в момент FTD, "сгорел быстро" в первую сессию, долгий вывод через сутки после запроса, выигрыш и деньги на балансе через сутки после FTD).
- **Действие по состоянию.** Рекомендация зависит от того, что видно в данных: вывод в обработке (провести быстро) или уже выплачен (через 2-3 дня повод вернуться), бонус еще отыгрывается (напомнить) или проигран (оффер без тяжелого вейджера). Состояние лежит в колонке `state` списка. Расчет потерь идет по FTD старше 7 дней, потому что вернулся игрок или нет, видно только через 7 дней. Если пользователь спрашивает "когда смотреть", объясни именно так и предложи запускать каждый день или поставить те же сигналы триггерами в CRM.

- **Норма** это доля вторых депозитов у похожих игроков без проблемных сигналов: тот же размер FTD, источник и страна (если таких меньше 30, размер FTD и источник, потом только размер FTD). Недобор считается до нормы, поэтому это верхняя граница; вилка денег: минимум только сами вторые депозиты, максимум Sum Dep вернувшегося за 30 дней.
- **Разница групп** описательная: журнал хранит назначение, а не факт контакта. Нельзя объявлять причинный эффект или дополнительную выручку без проверки эксперимента.
- **Сценарий показывает, где теряются игроки, а не доказывает причину.** Причину проверяет тест с контрольной группой.
- **Срезы со сценариями не складываются:** это другой взгляд на тех же игроков.
- Ответственная игра: игроки с флагами из `rg_flags` исключены и из расчета, и из списка. Без флагов контактный список не включать.

Определения сценариев, пороги и формулы: `references/scenarios.md`. Форматы выгрузок и `mapping.json`: `references/data.md`.
