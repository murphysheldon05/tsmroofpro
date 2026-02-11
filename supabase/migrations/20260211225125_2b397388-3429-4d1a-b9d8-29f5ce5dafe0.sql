
-- Create draw_requests table
CREATE TABLE public.draw_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_number TEXT NOT NULL,
  job_name TEXT,
  requested_amount NUMERIC NOT NULL,
  estimated_commission NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  denied_by UUID REFERENCES auth.users(id),
  denied_at TIMESTAMPTZ,
  denial_reason TEXT,
  paid_at TIMESTAMPTZ,
  deducted_from_commission_id UUID,
  deducted_at TIMESTAMPTZ,
  remaining_balance NUMERIC DEFAULT 0,
  notes TEXT,
  requires_manager_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_draw_requests_user_id ON public.draw_requests(user_id);
CREATE INDEX idx_draw_requests_status ON public.draw_requests(status);
CREATE INDEX idx_draw_requests_user_status ON public.draw_requests(user_id, status);

-- Timestamp trigger
CREATE TRIGGER update_draw_requests_updated_at
  BEFORE UPDATE ON public.draw_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.draw_requests ENABLE ROW LEVEL SECURITY;

-- Users can insert their own draws
CREATE POLICY "Users can insert own draw requests"
  ON public.draw_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own draws
CREATE POLICY "Users can view own draw requests"
  ON public.draw_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin can view all draws
CREATE POLICY "Admin can view all draw requests"
  ON public.draw_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Sales managers can view draws from their team
CREATE POLICY "Sales managers can view team draw requests"
  ON public.draw_requests FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'sales_manager')
    AND EXISTS (
      SELECT 1 FROM public.team_assignments ta
      WHERE ta.employee_id = draw_requests.user_id
      AND ta.manager_id = auth.uid()
    )
  );

-- Admin can update all draws
CREATE POLICY "Admin can update all draw requests"
  ON public.draw_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Sales managers can update draws for their team (approve/deny)
CREATE POLICY "Sales managers can update team draw requests"
  ON public.draw_requests FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'sales_manager')
    AND EXISTS (
      SELECT 1 FROM public.team_assignments ta
      WHERE ta.employee_id = draw_requests.user_id
      AND ta.manager_id = auth.uid()
    )
  );

-- Accounting managers can update draws (mark paid, deduct)
CREATE POLICY "Accounting can update draw requests"
  ON public.draw_requests FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.departments d ON d.id = p.department_id
      WHERE p.id = auth.uid() AND d.name = 'Accounting'
    )
  );
