-- Add SOP metadata fields to resources table
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS task_type text,
ADD COLUMN IF NOT EXISTS role_target text[],
ADD COLUMN IF NOT EXISTS urgency text,
ADD COLUMN IF NOT EXISTS owner_role text,
ADD COLUMN IF NOT EXISTS last_updated_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS purpose text,
ADD COLUMN IF NOT EXISTS when_to_use text,
ADD COLUMN IF NOT EXISTS common_mistakes text[];

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_resources_task_type ON public.resources(task_type);
CREATE INDEX IF NOT EXISTS idx_resources_urgency ON public.resources(urgency);

-- Add comment for documentation
COMMENT ON COLUMN public.resources.task_type IS 'Primary task type: inspection, sales, production, admin, accounting, closeout, etc.';
COMMENT ON COLUMN public.resources.role_target IS 'Target roles: sales_rep, production, manager, admin, field, office';
COMMENT ON COLUMN public.resources.urgency IS 'Urgency level: field (immediate), office (same day), manager (review)';
COMMENT ON COLUMN public.resources.owner_role IS 'Department or role that owns this SOP';
COMMENT ON COLUMN public.resources.purpose IS 'Purpose statement for this SOP';
COMMENT ON COLUMN public.resources.when_to_use IS 'When to use this SOP';
COMMENT ON COLUMN public.resources.common_mistakes IS 'Common mistakes to avoid';