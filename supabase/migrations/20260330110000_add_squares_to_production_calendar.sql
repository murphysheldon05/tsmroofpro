-- Add squares (job size) column to production_calendar_events for duration calculations
ALTER TABLE production_calendar_events
  ADD COLUMN squares INTEGER DEFAULT NULL;

-- Sanity check: squares should be positive when provided
ALTER TABLE production_calendar_events
  ADD CONSTRAINT production_calendar_events_squares_positive
  CHECK (squares IS NULL OR squares > 0);
