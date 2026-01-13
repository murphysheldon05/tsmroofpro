-- Create commission tiers table
CREATE TABLE public.commission_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  allowed_op_percentages DECIMAL[] NOT NULL DEFAULT ARRAY[0.10, 0.125, 0.15],
  allowed_profit_splits DECIMAL[] NOT NULL DEFAULT ARRAY[0.35, 0.40, 0.45, 0.50, 0.55, 0.60],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user tier assignments table
CREATE TABLE public.user_commission_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tier_id UUID NOT NULL REFERENCES public.commission_tiers(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.commission_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_commission_tiers ENABLE ROW LEVEL SECURITY;

-- Commission tiers policies
CREATE POLICY "Anyone can view active commission tiers"
ON public.commission_tiers
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage commission tiers"
ON public.commission_tiers
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- User commission tier policies
CREATE POLICY "Users can view their own tier assignment"
ON public.user_commission_tiers
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all tier assignments"
ON public.user_commission_tiers
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can manage tier assignments for their team"
ON public.user_commission_tiers
FOR ALL
USING (
  public.has_role(auth.uid(), 'manager') 
  AND EXISTS (
    SELECT 1 FROM public.team_assignments 
    WHERE manager_id = auth.uid() 
    AND employee_id = user_commission_tiers.user_id
  )
);

-- Trigger for updated_at on commission_tiers
CREATE TRIGGER update_commission_tiers_updated_at
BEFORE UPDATE ON public.commission_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default tiers
INSERT INTO public.commission_tiers (name, description, allowed_op_percentages, allowed_profit_splits)
VALUES 
  ('Junior Rep', 'Entry level sales representatives', ARRAY[0.10, 0.125], ARRAY[0.35, 0.40]),
  ('Standard Rep', 'Standard sales representatives', ARRAY[0.10, 0.125, 0.15], ARRAY[0.40, 0.45, 0.50]),
  ('Senior Rep', 'Experienced sales representatives', ARRAY[0.10, 0.125, 0.15], ARRAY[0.45, 0.50, 0.55, 0.60]);