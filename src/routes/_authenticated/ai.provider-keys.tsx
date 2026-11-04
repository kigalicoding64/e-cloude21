import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { PROVIDERS, PROVIDER_IDS, type ProviderId } from "@/lib/ai-providers";
import { addProviderKey } from "@/lib/ai-provider-keys.functions";
import { PUBLIC_BASE_URL } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/ai/provider-keys")({
  head: () => ({
    meta: [
      { title: "AI Provider Keys — E-Cloud" },
      { name: "description", content: "Store OpenAI, Claude, Gemini and other AI keys once and call them all with one E-Cloud API key." },
    ],
  }),
  component: ProviderKeysPage,
});

function ProviderKeysPage() {
  const qc = useQueryClient();
  const add = useServerFn(addProviderKey);
  const [provider, setProvider] = useState<ProviderId>("openai");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["ai-provider-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_provider_keys")
        .select("id, provider, label, base_url, key_hint, is_active, last_used_at, request_count, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: () =>
      add({ data: { provider, label: label || PROVIDERS[provider].name, api_key: apiKey, base_url: baseUrl || null } }),
    onSuccess: () => {
      toast.success("Key saved securely");
      setApiKey(""); setLabel(""); setBaseUrl("");
      qc.invalidateQueries({ queryKey: ["ai-provider-keys"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save key"),
  });

  const toggle = async (id: string, is_active: boolean) => {
    await supabase.from("ai_provider_keys").update({ is_active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["ai-provider-keys"] });
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this key?")) return;
    await supabase.from("ai_provider_keys").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["ai-provider-keys"] });
  };

  const example = `import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${PUBLIC_BASE_URL}/api/public/v1/ai",
  apiKey: "eck_live_your_ecloud_key", // only your E-Cloud key
});

const res = await client.chat.completions.create({
  model: "${provider}/${PROVIDERS[provider].example}",
  messages: [{ role: "user", content: "Hello!" }],
});`;

  return (
    <div className="mx-auto max-w-5xl px-8 py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><KeyRound className="h-7 w-7" /> AI Provider Keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save your OpenAI, Claude, Gemini, Groq and other AI keys here once. Your apps then use only your E-Cloud API key. Saved keys are encrypted and never shown again.
        </p>
      </div>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold">Add a key</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as ProviderId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDER_IDS.map((p) => <SelectItem key={p} value={p}>{PROVIDERS[p].name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={PROVIDERS[provider].name} />
          </div>
          <div className="space-y-1.5">
            <Label>API key</Label>
            <Input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={PROVIDERS[provider].placeholder} />
          </div>
          <div className="space-y-1.5">
            <Label>Address {provider === "custom" ? "(required)" : "(optional)"}</Label>
            <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={PROVIDERS[provider].baseUrl || "https://ai.egreedtech.org/v1"} />
          </div>
        </div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save key"}</Button>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Saved keys</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No keys yet.</p>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">{r.label} <Badge variant="secondary" className="ml-2">{r.provider}</Badge></div>
                  <div className="text-xs text-muted-foreground">
                    {r.key_hint} · {r.request_count} requests{r.last_used_at ? ` · last used ${new Date(r.last_used_at).toLocaleString()}` : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggle(r.id, !r.is_active)}>{r.is_active ? "Turn off" : "Turn on"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)} aria-label="Delete key"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Use it from any app</h2>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(example); toast.success("Copied"); }}>
            <Copy className="mr-1 h-4 w-4" /> Copy
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Pick the model as <code>provider/model</code>. Your E-Cloud key needs the "read" permission.</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs"><code>{example}</code></pre>
      </Card>
    </div>
  );
}
