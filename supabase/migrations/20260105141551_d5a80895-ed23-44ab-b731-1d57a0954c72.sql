-- Create policies table for company policies
CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active policies
CREATE POLICY "Anyone can view active policies"
ON public.policies
FOR SELECT
USING (is_active = true);

-- Only admins can manage policies
CREATE POLICY "Admins can manage policies"
ON public.policies
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_policies_updated_at
BEFORE UPDATE ON public.policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();