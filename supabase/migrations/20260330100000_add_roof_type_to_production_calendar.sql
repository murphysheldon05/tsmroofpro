-- Add roof_type column to production_calendar_events for product-line tracking
ALTER TABLE production_calendar_events
  ADD COLUMN roof_type TEXT DEFAULT NULL;

-- Constrain to known product lines
ALTER TABLE production_calendar_events
  ADD CONSTRAINT production_calendar_events_roof_type_check
  CHECK (roof_type IN ('tile', 'shingle', 'foam', 'coatings'));

-- Index for fast lookups by roof_type (used by schedule AI assistant)
CREATE INDEX idx_production_calendar_events_roof_type
  ON production_calendar_events (roof_type)
  WHERE roof_type IS NOT NULL;
