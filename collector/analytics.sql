-- ═══════════════════════════════════════════════
-- FlightWatch Analytics Queries
-- Run these in Supabase SQL Editor
-- ═══════════════════════════════════════════════


-- ── 1. PRICE TRENDS PER ROUTE ────────────────────────────────────────────────
-- Daily cheapest price per route over time
SELECT
  route,
  DATE(fetched_at) AS day,
  MIN(price)       AS cheapest,
  MAX(price)       AS most_expensive,
  ROUND(AVG(price)) AS avg_price
FROM price_history
GROUP BY route, DATE(fetched_at)
ORDER BY route, day DESC;


-- ── 2. BEST DAY OF WEEK TO BOOK ──────────────────────────────────────────────
-- Which weekday has the lowest prices on average?
SELECT
  route,
  TO_CHAR(fetched_at, 'Day') AS day_of_week,
  EXTRACT(DOW FROM fetched_at) AS dow_num,
  ROUND(AVG(price)) AS avg_price,
  MIN(price) AS min_price,
  COUNT(*) AS samples
FROM price_history
GROUP BY route, day_of_week, dow_num
ORDER BY route, dow_num;


-- ── 3. SEASONAL PATTERNS ─────────────────────────────────────────────────────
-- Monthly average price per route
SELECT
  route,
  TO_CHAR(fetched_at, 'YYYY-MM') AS month,
  ROUND(AVG(price)) AS avg_price,
  MIN(price) AS min_price,
  MAX(price) AS max_price
FROM price_history
GROUP BY route, month
ORDER BY route, month;


-- ── 4. PRICE DROP FREQUENCY ──────────────────────────────────────────────────
-- How often does price drop more than 5% day-over-day?
WITH daily AS (
  SELECT
    route,
    DATE(fetched_at) AS day,
    MIN(price) AS price
  FROM price_history
  GROUP BY route, DATE(fetched_at)
),
with_prev AS (
  SELECT
    route,
    day,
    price,
    LAG(price) OVER (PARTITION BY route ORDER BY day) AS prev_price
  FROM daily
)
SELECT
  route,
  COUNT(*) FILTER (WHERE price < prev_price * 0.95) AS big_drops,
  COUNT(*) FILTER (WHERE price > prev_price * 1.05) AS big_rises,
  COUNT(*) AS total_days,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE price < prev_price * 0.95) / COUNT(*), 1
  ) AS drop_pct
FROM with_prev
WHERE prev_price IS NOT NULL
GROUP BY route
ORDER BY drop_pct DESC;


-- ── 5. BEST PRICE EVER SEEN ───────────────────────────────────────────────────
SELECT
  route,
  MIN(price) AS best_price_ever,
  MAX(price) AS worst_price_ever,
  ROUND(AVG(price)) AS all_time_avg,
  MIN(fetched_at) AS tracking_since,
  COUNT(DISTINCT DATE(fetched_at)) AS days_tracked
FROM price_history
GROUP BY route
ORDER BY route;


-- ── 6. DAYS IN ADVANCE ANALYSIS ──────────────────────────────────────────────
-- Is it cheaper to book 30, 60, or 90 days ahead?
SELECT
  origin,
  destination,
  (depart_date - DATE(fetched_at)) AS days_before_flight,
  ROUND(AVG(price)) AS avg_price,
  MIN(price) AS min_price,
  COUNT(*) AS samples
FROM price_history
GROUP BY origin, destination, days_before_flight
HAVING COUNT(*) >= 3
ORDER BY origin, destination, days_before_flight;


-- ── 7. LAST 7 DAYS TREND ─────────────────────────────────────────────────────
SELECT
  route,
  DATE(fetched_at) AS day,
  MIN(price) AS price
FROM price_history
WHERE fetched_at >= NOW() - INTERVAL '7 days'
GROUP BY route, DATE(fetched_at)
ORDER BY route, day;


-- ── 8. ALERT: PRICE BELOW THRESHOLD ─────────────────────────────────────────
-- Find days where price was below your target (change 600 to your target)
SELECT
  route,
  DATE(fetched_at) AS day,
  MIN(price) AS price
FROM price_history
WHERE price < 600
GROUP BY route, DATE(fetched_at)
ORDER BY day DESC;
