-- Training Hub: hide catalog Loom videos and add custom Loom videos (merged with src/data/training-videos.json in the app)

CREATE TABLE public.training_hub_suppressions (
  loom_video_id text NOT NULL PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE public.training_hub_custom_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_slug text NOT NULL,
  loom_video_id text NOT NULL UNIQUE,
  title text NOT NULL,
  share_url text NOT NULL,
  embed_url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT training_hub_custom_videos_category_slug_check CHECK (
    category_slug = ANY (ARRAY['sales'::text, 'acculynx'::text, 'estimating'::text])
  )
);

CREATE TRIGGER update_training_hub_custom_videos_updated_at
BEFORE UPDATE ON public.training_hub_custom_videos
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

ALTER TABLE public.training_hub_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_hub_custom_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view training hub suppressions"
ON public.training_hub_suppressions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin or manager can insert training hub suppressions"
ON public.training_hub_suppressions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin or manager can delete training hub suppressions"
ON public.training_hub_suppressions
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Authenticated can view training hub custom videos"
ON public.training_hub_custom_videos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin or manager can insert training hub custom videos"
ON public.training_hub_custom_videos
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin or manager can update training hub custom videos"
ON public.training_hub_custom_videos
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admin or manager can delete training hub custom videos"
ON public.training_hub_custom_videos
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')
);
