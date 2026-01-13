-- Create warranty_requests table
CREATE TABLE public.warranty_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Customer & Job Info
  customer_name TEXT NOT NULL,
  job_address TEXT NOT NULL,
  original_job_number TEXT NOT NULL,
  original_install_date DATE NOT NULL,
  roof_type TEXT NOT NULL CHECK (roof_type IN ('shingle', 'tile', 'foam', 'coating', 'other')),
  
  -- Warranty Details
  warranty_type TEXT NOT NULL CHECK (warranty_type IN ('workmanship', 'manufacturer', 'combination')),
  warranty_coverage_description TEXT NOT NULL,
  warranty_expiration_date DATE NOT NULL,
  manufacturer TEXT,
  
  -- Issue Intake
  date_submitted DATE NOT NULL DEFAULT CURRENT_DATE,
  issue_description TEXT NOT NULL,
  source_of_request TEXT NOT NULL CHECK (source_of_request IN ('homeowner', 'office', 'sales', 'manufacturer')),
  
  -- Assignment & Accountability
  assigned_production_member UUID REFERENCES auth.users(id),
  secondary_support UUID REFERENCES auth.users(id),
  date_assigned DATE,
  priority_level TEXT NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'emergency')),
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'assigned', 'in_review', 'scheduled', 'in_progress', 'waiting_on_materials', 'waiting_on_manufacturer', 'completed', 'denied')),
  last_status_change_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Resolution
  resolution_summary TEXT,
  date_completed DATE,
  labor_cost NUMERIC(10,2),
  material_cost NUMERIC(10,2),
  is_manufacturer_claim_filed BOOLEAN DEFAULT false,
  closeout_photos_uploaded BOOLEAN DEFAULT false,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warranty_notes table for timestamped comments
CREATE TABLE public.warranty_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warranty_id UUID NOT NULL REFERENCES public.warranty_requests(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warranty_documents table for file references
CREATE TABLE public.warranty_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warranty_id UUID NOT NULL REFERENCES public.warranty_requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  document_type TEXT NOT NULL CHECK (document_type IN ('intake_photo', 'closeout_photo', 'document')),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.warranty_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for warranty_requests
-- Admins and managers have full access
CREATE POLICY "Admins and managers can manage all warranties"
ON public.warranty_requests
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Production members can view and update their assigned warranties
CREATE POLICY "Production members can view assigned warranties"
ON public.warranty_requests
FOR SELECT
USING (
  assigned_production_member = auth.uid() OR 
  secondary_support = auth.uid() OR
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "Production members can update assigned warranties"
ON public.warranty_requests
FOR UPDATE
USING (
  assigned_production_member = auth.uid() OR 
  secondary_support = auth.uid()
);

-- Employees can view all warranties (read-only for office admin visibility)
CREATE POLICY "Employees can view all warranties"
ON public.warranty_requests
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for warranty_notes
CREATE POLICY "Anyone can view notes on accessible warranties"
ON public.warranty_notes
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create notes on accessible warranties"
ON public.warranty_notes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete notes"
ON public.warranty_notes
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for warranty_documents
CREATE POLICY "Anyone can view documents on accessible warranties"
ON public.warranty_documents
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can upload documents"
ON public.warranty_documents
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete documents"
ON public.warranty_documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create storage bucket for warranty documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('warranty-documents', 'warranty-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can view warranty documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'warranty-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload warranty documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'warranty-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete warranty documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'warranty-documents' AND has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at and last_status_change_at
CREATE OR REPLACE FUNCTION public.update_warranty_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.last_status_change_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_warranty_requests_timestamps
BEFORE UPDATE ON public.warranty_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_warranty_timestamps();