-- Migration: Exponential-backoff auto-retry tracking for stuck/failed transcriptions.
--   retry_count:   total attempts so far (0 on first try)
--   last_retry_at: when the last attempt failed; used to compute next eligible retry time
--
-- Retry schedule (backoff doubles each failure, capped at 24h):
--   attempt 1: immediate
--   attempt 2: 5 min after fail 1
--   attempt 3: 10 min after fail 2
--   attempt 4: 20 min after fail 3
--   attempt 5: 40 min
--   attempt 6: 80 min (~1.3h)
--   attempt 7: 160 min (~2.7h)
--   attempt 8: 320 min (~5.3h)
--   attempt 9: 640 min (~10.7h)
--   attempt 10: 1280 min capped at 24h (~21.3h)
-- After 10 total attempts, the video stays failed and requires manual Reprocess.
--
-- Run: wrangler d1 execute seportal-db --file=workers/api/migrations/add_retry_columns.sql --remote

ALTER TABLE videos ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE videos ADD COLUMN last_retry_at TEXT;
