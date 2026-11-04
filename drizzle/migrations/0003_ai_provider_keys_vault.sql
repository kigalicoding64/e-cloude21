CREATE TABLE public.ai_provider_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  provider text NOT NULL,
  label text NOT NULL,
  base_url text,
  key_ciphertext text NOT NULL,
  key_iv text NOT NULL,
  key_hint text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT (id, owner_id, provider, label, base_url, key_hint, is_active, last_used_at, request_count, created_at, updated_at) ON public.ai_provider_keys TO authenticated;
GRANT INSERT, DELETE ON public.ai_provider_keys TO authenticated;
GRANT UPDATE (label, base_url, is_active) ON public.ai_provider_keys TO authenticated;
GRANT ALL ON public.ai_provider_keys TO service_role;
ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own provider keys" ON public.ai_provider_keys
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX idx_ai_provider_keys_owner ON public.ai_provider_keys(owner_id, provider);
CREATE TRIGGER trg_ai_provider_keys_updated BEFORE UPDATE ON public.ai_provider_keys
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();