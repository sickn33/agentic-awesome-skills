-- Inputs are normalized month_index integers, one user per id, and spend rows at source grain.
-- query: retention
WITH cohort_sizes AS (
 SELECT cohort_month, COUNT(*) AS cohort_size FROM users GROUP BY cohort_month
), active AS (
 SELECT DISTINCT u.cohort_month, e.month_index - u.cohort_month AS month_offset, u.id
 FROM users u JOIN events e ON e.user_id = u.id
 WHERE e.month_index >= u.cohort_month
)
SELECT a.cohort_month, a.month_offset, COUNT(*) AS active_users,
       100.0 * COUNT(*) / c.cohort_size AS retention_pct
FROM active a JOIN cohort_sizes c ON c.cohort_month = a.cohort_month
GROUP BY a.cohort_month, a.month_offset, c.cohort_size;
-- query: cac
WITH spend_by_month AS (
 SELECT month_index, SUM(amount) AS spend FROM spend GROUP BY month_index
), acquired AS (
 SELECT cohort_month AS month_index, COUNT(*) AS customers
 FROM users WHERE source = 'marketing' GROUP BY cohort_month
)
SELECT s.month_index, s.spend, COALESCE(a.customers, 0) AS customers,
       1.0 * s.spend / NULLIF(a.customers, 0) AS cac
FROM spend_by_month s LEFT JOIN acquired a ON a.month_index = s.month_index;
-- query: growth
WITH previous AS (
 SELECT month_index, amount, LAG(amount) OVER (ORDER BY month_index) AS previous_amount
 FROM monthly_revenue
)
SELECT month_index, amount, 100.0 * (amount - previous_amount) / NULLIF(previous_amount, 0) AS growth_pct
FROM previous;
