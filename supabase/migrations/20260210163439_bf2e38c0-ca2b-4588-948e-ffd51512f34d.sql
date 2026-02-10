
-- E1: Add proper status column to delivery_calendar_events
ALTER TABLE public.delivery_calendar_events
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled';

-- Migrate existing STATUS:xxx| values from description into the new column
UPDATE public.delivery_calendar_events
SET 
  status = CASE 
    WHEN description ~ '^STATUS:(\w+)\|' THEN (regexp_match(description, '^STATUS:(\w+)\|'))[1]
    ELSE 'scheduled'
  END,
  description = CASE
    WHEN description ~ '^STATUS:\w+\|' THEN regexp_replace(description, '^STATUS:\w+\|', '')
    ELSE description
  END
WHERE description IS NOT NULL AND description ~ '^STATUS:';
