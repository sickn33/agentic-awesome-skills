-- Выгрузки для скилла second-deposit: запросы для аналитика или администратора базы.
--
-- Схема у каждой платформы своя. Замените имена в угловых скобках на свои таблицы и колонки,
-- а названия после AS оставьте как есть: тогда файлы совпадут с examples/export-example.xlsx
-- и mapping соберется почти без вопросов (готовые: examples/mapping-csv-example.json и mapping-one-file-example.json).
--
-- Каждый запрос сохраните в CSV с таким именем, как в заголовке. Для ежедневных выгрузок добавьте дату:
-- deposits_2026-10-17.csv. Скилл возьмет самый свежий файл, если в mapping стоит "latest": true.
--
-- Период (:date_from): первый запуск и раз в месяц 120 дней до сегодня, каждый день 7 дней.
--   PostgreSQL:  CURRENT_DATE - INTERVAL '120 days'
--   MySQL:       CURDATE() - INTERVAL 120 DAY
--   ClickHouse:  today() - 120
--   SQL Server:  DATEADD(day, -120, CAST(GETDATE() AS date))
-- Время лучше в UTC. Если база хранит местное время, скажите Claude, в каком поясе.
-- Статусы выгружайте как есть: скилл сам сопоставит их и спросит, если какой-то непонятен.
-- Имена, email, телефоны и адреса не нужны: только ID игрока.


-- 1. Депозиты (обязательно): все попытки за период, включая отклоненные, брошенные и отмененные.
--    Без неудачных попыток не посчитаются три причины про кассу.
--    Файл: deposits.csv
SELECT
  d.<player_id>       AS player_id,       -- ID игрока, одинаковый во всех файлах
  d.<created_at>      AS created_at,      -- дата и время попытки
  d.<amount>          AS amount,          -- сумма
  d.<currency>        AS currency,        -- код валюты, если валют несколько
  d.<status>          AS status,          -- статус как есть: успешный, отклонен, брошен, отменен, в обработке
  d.<payment_method>  AS method,          -- способ оплаты
  d.<decline_reason>  AS decline_reason   -- причина отказа из кассы, если есть: отличает лимит и блокировку в банке от обычного отказа
FROM <deposits_table> d
WHERE d.<created_at> >= :date_from;


-- 2. Выводы (желательно): запросы на вывод за тот же период, со статусом и временем выплаты.
--    Файл: withdrawals.csv
SELECT
  w.<player_id>      AS player_id,
  w.<created_at>     AS created_at,       -- время запроса
  w.<amount>         AS amount,
  w.<currency>       AS currency,
  w.<status>         AS status,           -- выплачен, в обработке, отклонен, отменен игроком
  w.<processed_at>   AS processed_at      -- время выплаты: для причины "Долгий вывод"
FROM <withdrawals_table> w
WHERE w.<created_at> >= :date_from;


-- 3. Бонусы (желательно): начисленные бонусы с вейджером и итогом.
--    Файл: bonuses.csv
SELECT
  b.<player_id>     AS player_id,
  b.<issued_at>     AS issued_at,         -- время начисления
  b.<bonus_name>    AS bonus_name,
  b.<wager>         AS wager,             -- вейджер числом; если колонки нет, скилл возьмет его из названия
  b.<bonus_amount>  AS amount,
  b.<status>        AS status             -- активен, проигран, истек, отыгран, отменен
FROM <bonuses_table> b
WHERE b.<issued_at> >= :date_from;


-- 4. Ставки по дням (желательно): только реальные деньги, без бонусных.
--    Файл: bets.csv
SELECT
  g.<player_id>                  AS player_id,
  CAST(g.<created_at> AS DATE)   AS date,
  SUM(g.<real_bet_amount>)       AS bets,
  SUM(g.<real_win_amount>)       AS wins,
  COUNT(*)                       AS rounds
FROM <bets_table> g
WHERE g.<created_at> >= :date_from
GROUP BY g.<player_id>, CAST(g.<created_at> AS DATE);


-- 5. Игроки (желательно): регистрация, страна, источник, флаги ответственной игры, запрос документов,
--    дата первого депозита. Для ежедневной выгрузки дата первого депозита обязательна.
--    Файл: players.csv
SELECT
  p.<player_id>          AS player_id,
  p.<registered_at>      AS registered_at,
  p.<country>            AS country,              -- код страны, лучше ISO: BR, DE
  p.<affiliate_or_source> AS source,
  CASE WHEN <самоисключение или тайм-аут активны> THEN 'Yes' ELSE '' END AS self_excluded,
  CASE WHEN <у игрока есть лимит депозитов> THEN 'Yes' ELSE '' END       AS deposit_limit,
  p.<kyc_requested_at>   AS kyc_requested_at,     -- когда запросили документы
  f.first_deposit_at     AS first_deposit_at
FROM <players_table> p
LEFT JOIN (
  SELECT <player_id> AS player_id, MIN(<created_at>) AS first_deposit_at
  FROM <deposits_table>
  WHERE <status> IN (<успешные статусы>)
  GROUP BY <player_id>
) f ON f.player_id = p.<player_id>
WHERE p.<registered_at> >= :date_from
   OR f.first_deposit_at >= :date_from;


-- 6. Минимум одним запросом: депозиты и выводы со всеми статусами, данные игрока в каждой строке.
--    Дает 7 из 12 причин (без бонусов и ставок), норму, деньги, список на сегодня и правила стран.
--    Если выводы достать трудно, уберите вторую часть после UNION ALL: останутся 4 причины, три про кассу и запрос документов.
--    Файл: one-file.csv
--    В некоторых базах пустое значение в UNION нужно привести к типу: CAST(NULL AS TIMESTAMP).
SELECT
  t.player_id, t.created_at, t.type, t.amount, t.currency, t.status, t.method, t.decline_reason, t.processed_at,
  p.<country>           AS country,
  p.<affiliate_or_source> AS source,
  p.<registered_at>     AS registered_at,
  p.<kyc_requested_at>  AS kyc_requested_at,
  f.first_deposit_at    AS first_deposit_at,
  CASE WHEN <самоисключение или тайм-аут активны> THEN 'Yes' ELSE '' END AS self_excluded,
  CASE WHEN <у игрока есть лимит депозитов> THEN 'Yes' ELSE '' END       AS deposit_limit
FROM (
  SELECT d.<player_id> AS player_id, d.<created_at> AS created_at, 'Deposit' AS type, d.<amount> AS amount,
         d.<currency> AS currency, d.<status> AS status, d.<payment_method> AS method,
         d.<decline_reason> AS decline_reason, NULL AS processed_at
  FROM <deposits_table> d
  WHERE d.<created_at> >= :date_from
  UNION ALL
  SELECT w.<player_id>, w.<created_at>, 'Withdrawal', w.<amount>,
         w.<currency>, w.<status>, w.<payment_method>,
         NULL, w.<processed_at>
  FROM <withdrawals_table> w
  WHERE w.<created_at> >= :date_from
) t
JOIN <players_table> p ON p.<player_id> = t.player_id
LEFT JOIN (
  SELECT <player_id> AS player_id, MIN(<created_at>) AS first_deposit_at
  FROM <deposits_table>
  WHERE <status> IN (<успешные статусы>)
  GROUP BY <player_id>
) f ON f.player_id = t.player_id;
