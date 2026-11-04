CREATE TABLE public.ai_provider_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  key_id uuid REFERENCES public.ai_provider_keys(id) ON DELETE SET NULL,
  provider text NOT NULL,
  model text NOT NULL,
  status integer NOT NULL,
  latency_ms integer NOT NULL DEFAULT 0,
  prompt_tokens integer,
  completion_tokens integer,
  estimated_cost_usd numeric(12,6),
  streamed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_provider_requests TO authenticated;
GRANT ALL ON public.ai_provider_requests TO service_role;
ALTER TABLE public.ai_provider_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner views own provider requests" ON public.ai_provider_requests
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE INDEX idx_ai_provider_requests_owner ON public.ai_provider_requests(owner_id, created_at DESC);