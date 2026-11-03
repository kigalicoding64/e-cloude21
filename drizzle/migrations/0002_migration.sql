CREATE TABLE public.model_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  file_id uuid,
  name text NOT NULL,
  title text NOT NULL DEFAULT 'AI Assistant',
  greeting text NOT NULL DEFAULT 'Hi! How can I help you?',
  system_prompt text NOT NULL DEFAULT 'You are a helpful assistant.',
  temperature numeric NOT NULL DEFAULT 0.7,
  max_tokens int NOT NULL DEFAULT 512,
  inference_url text,
  primary_color text NOT NULL DEFAULT '#2563eb',
  theme text NOT NULL DEFAULT 'light',
  allowed_origins text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.model_widgets TO authenticated;
GRANT ALL ON public.model_widgets TO service_role;
ALTER TABLE public.model_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY model_widgets_own ON public.model_widgets FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);