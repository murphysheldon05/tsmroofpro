
-- Create training document categories table
CREATE TABLE public.training_document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_document_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view categories
CREATE POLICY "Anyone can view training document categories"
ON public.training_document_categories FOR SELECT
TO authenticated
USING (true);

-- Admin and manager can manage categories
CREATE POLICY "Admin/Manager can insert training document categories"
ON public.training_document_categories FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin/Manager can update training document categories"
ON public.training_document_categories FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin/Manager can delete training document categories"
ON public.training_document_categories FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

-- Seed default categories
INSERT INTO public.training_document_categories (name, slug, sort_order) VALUES
  ('Sales Scripts', 'sales-scripts', 1),
  ('Email Templates', 'email-templates', 2),
  ('Communication Templates', 'communication-templates', 3),
  ('Manufacturer Specs', 'manufacturer-specs', 4),
  ('Product Knowledge', 'product-knowledge', 5),
  ('General Templates', 'general-templates', 6),
  ('Company Forms', 'company-forms', 7);

-- Create training documents table
CREATE TABLE public.training_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES public.training_document_categories(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_documents ENABLE ROW LEVEL SECURITY;

-- Everyone can view documents
CREATE POLICY "Anyone can view training documents"
ON public.training_documents FOR SELECT
TO authenticated
USING (true);

-- Admin and manager can manage documents
CREATE POLICY "Admin/Manager can insert training documents"
ON public.training_documents FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin/Manager can update training documents"
ON public.training_documents FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin/Manager can delete training documents"
ON public.training_documents FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

-- Create trigger for updated_at
CREATE TRIGGER update_training_documents_updated_at
BEFORE UPDATE ON public.training_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_document_categories_updated_at
BEFORE UPDATE ON public.training_document_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for training documents
INSERT INTO storage.buckets (id, name, public) VALUES ('training-documents', 'training-documents', false);

-- Storage policies: anyone authenticated can read
CREATE POLICY "Authenticated users can view training documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'training-documents');

-- Admin/Manager can upload
CREATE POLICY "Admin/Manager can upload training documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-documents' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  )
);

-- Admin/Manager can delete
CREATE POLICY "Admin/Manager can delete training documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-documents' AND (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
  )
);
