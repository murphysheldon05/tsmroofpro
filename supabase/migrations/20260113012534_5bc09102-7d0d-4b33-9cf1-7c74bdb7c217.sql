
-- Create enums for the module
CREATE TYPE public.trade_type AS ENUM ('roofing', 'tile', 'shingle', 'foam', 'coatings', 'metal', 'gutters', 'drywall', 'paint', 'other');
CREATE TYPE public.service_area AS ENUM ('phoenix_metro', 'west_valley', 'east_valley', 'north_valley', 'prescott', 'other');
CREATE TYPE public.entity_status AS ENUM ('active', 'on_hold', 'do_not_use');
CREATE TYPE public.doc_status AS ENUM ('received', 'missing');
CREATE TYPE public.vendor_type AS ENUM ('supplier', 'dump', 'equipment_rental', 'safety', 'marketing', 'other');
CREATE TYPE public.contact_method AS ENUM ('call', 'text', 'email');
CREATE TYPE public.prospect_type AS ENUM ('subcontractor', 'vendor');
CREATE TYPE public.prospect_source AS ENUM ('inbound_call', 'referral', 'jobsite_meet', 'other');
CREATE TYPE public.prospect_stage AS ENUM ('new', 'contacted', 'waiting_docs', 'trial_job', 'approved', 'not_a_fit');

-- Subcontractors table
CREATE TABLE public.subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  primary_contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  trade_type trade_type NOT NULL DEFAULT 'other',
  service_areas service_area[] NOT NULL DEFAULT '{phoenix_metro}',
  status entity_status NOT NULL DEFAULT 'active',
  internal_rating INTEGER CHECK (internal_rating >= 1 AND internal_rating <= 5),
  notes TEXT,
  coi_status doc_status NOT NULL DEFAULT 'missing',
  coi_expiration_date DATE,
  w9_status doc_status NOT NULL DEFAULT 'missing',
  ic_agreement_status doc_status NOT NULL DEFAULT 'missing',
  last_requested_date DATE,
  last_received_date DATE,
  requested_docs TEXT[],
  docs_due_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  primary_contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  vendor_type vendor_type NOT NULL DEFAULT 'other',
  service_areas service_area[] NOT NULL DEFAULT '{phoenix_metro}',
  status entity_status NOT NULL DEFAULT 'active',
  account_number TEXT,
  preferred_contact_method contact_method DEFAULT 'email',
  notes TEXT,
  coi_status doc_status DEFAULT 'missing',
  coi_expiration_date DATE,
  w9_status doc_status DEFAULT 'missing',
  ic_agreement_status doc_status DEFAULT 'missing',
  last_requested_date DATE,
  last_received_date DATE,
  requested_docs TEXT[],
  docs_due_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prospects table
CREATE TABLE public.prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  prospect_type prospect_type NOT NULL,
  trade_vendor_type TEXT,
  source prospect_source NOT NULL DEFAULT 'other',
  stage prospect_stage NOT NULL DEFAULT 'new',
  notes TEXT,
  next_followup_date DATE,
  assigned_owner TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance requests log
CREATE TABLE public.compliance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type TEXT NOT NULL,
  recipient_id UUID NOT NULL,
  recipient_name TEXT NOT NULL,
  documents_requested TEXT[] NOT NULL,
  due_date DATE,
  notes TEXT,
  requested_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subcontractors
CREATE POLICY "Admins and managers can manage subcontractors"
ON public.subcontractors FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Employees can view subcontractors"
ON public.subcontractors FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for vendors
CREATE POLICY "Admins and managers can manage vendors"
ON public.vendors FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Employees can view vendors"
ON public.vendors FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for prospects
CREATE POLICY "Admins and managers can manage prospects"
ON public.prospects FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Employees can view prospects"
ON public.prospects FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for compliance_requests
CREATE POLICY "Admins and managers can manage compliance requests"
ON public.compliance_requests FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Employees can view compliance requests"
ON public.compliance_requests FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create storage bucket for compliance documents
INSERT INTO storage.buckets (id, name, public) VALUES ('compliance-documents', 'compliance-documents', false);

-- Storage policies
CREATE POLICY "Admins and managers can upload compliance docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'compliance-documents' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Admins and managers can update compliance docs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'compliance-documents' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Admins and managers can delete compliance docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'compliance-documents' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Authenticated users can view compliance docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'compliance-documents' AND auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_subcontractors_updated_at
BEFORE UPDATE ON public.subcontractors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prospects_updated_at
BEFORE UPDATE ON public.prospects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
