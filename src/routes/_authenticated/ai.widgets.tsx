import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2, MessageSquare } from "lucide-react";
import { PUBLIC_BASE_URL } from "@/lib/site";
import { formatBytes } from "@/lib/format";
import { isGgufFile, ggufQuant, isSafeInferenceUrl, widgetSnippet } from "@/lib/model-widget";

export const Route = createFileRoute("/_authenticated/ai/widgets")({
  head: () => ({
    meta: [
      { title: "GGUF Model Widgets — E-Cloud" },
      { name: "description", content: "Turn your uploaded GGUF models into a chat widget for any website." },
    ],
  }),
  component: WidgetsPage,
});

function WidgetsPage() {
  const qc = useQueryClient();
  const models = useQuery({
    queryKey: ["gguf-files"],
    queryFn: async () => {
      const { data } = await supabase.from("files").select("id, name, size").eq("is_trashed", false).ilike("name", "%.gguf").order("created_at", { ascending: false });
      return (data ?? []).filter((f) => isGgufFile(f.name));
    },
  });
  const widgets = useQuery({
    queryKey: ["model-widgets"],
    queryFn: async () => {
      const { data } = await supabase.from("model_widgets").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const [form, setForm] = useState({ file_id: "", name: "", title: "AI Assistant", greeting: "Hi! How can I help you?", system_prompt: "You are a helpful assistant.", inference_url: "", primary_color: "#2563eb", theme: "light", allowed_origins: "" });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.file_id) return toast.error("Choose a .gguf model first");
    if (form.inference_url && !isSafeInferenceUrl(form.inference_url)) return toast.error("Model server must be a public https:// address");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("model_widgets").insert({
      owner_id: u.user.id,
      file_id: form.file_id,
      name: form.name || models.data?.find((m) => m.id === form.file_id)?.name || "Model",
      title: form.title, greeting: form.greeting, system_prompt: form.system_prompt,
      inference_url: form.inference_url || null, primary_color: form.primary_color, theme: form.theme,
      allowed_origins: form.allowed_origins.split(/[\s,]+/).filter(Boolean),
    });
    if (error) return toast.error(error.message);
    toast.success("Widget created");
    qc.invalidateQueries({ queryKey: ["model-widgets"] });
  }

  async function update(id: string, patch: Record<string, unknown>) {
    const { error } = await supabase.from("model_widgets").update(patch).eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["model-widgets"] });
  }
  async function remove(id: string) {
    if (!confirm("Delete this widget? Websites using it will stop working.")) return;
    await supabase.from("model_widgets").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["model-widgets"] });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div>
        <h1 className="font-display text-3xl font-bold">GGUF Model Widgets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a <code>.gguf</code> model in <Link to="/files" className="underline">Files</Link>, connect the server that runs it, then paste one line of code into any website.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-semibold">New widget</h2>
        {models.data && models.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No .gguf models yet. Upload one on the Files page first.</p>
        ) : (
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Model file</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.file_id} onChange={set("file_id")}>
                <option value="">Choose a .gguf model…</option>
                {models.data?.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} · {formatBytes(m.size)}{ggufQuant(m.name) ? ` · ${ggufQuant(m.name)}` : ""}</option>
                ))}
              </select>
            </div>
            <div><Label>Widget name</Label><Input value={form.name} onChange={set("name")} placeholder="Support bot" /></div>
            <div><Label>Chat title</Label><Input value={form.title} onChange={set("title")} /></div>
            <div className="md:col-span-2"><Label>Greeting</Label><Input value={form.greeting} onChange={set("greeting")} /></div>
            <div className="md:col-span-2"><Label>Instructions for the model</Label><Textarea value={form.system_prompt} onChange={set("system_prompt")} rows={3} /></div>
            <div className="md:col-span-2">
              <Label>Model server address</Label>
              <Input value={form.inference_url} onChange={set("inference_url")} placeholder="https://llm.yourserver.com" />
              <p className="mt-1 text-xs text-muted-foreground">The https address of the llama.cpp or Ollama server running this .gguf file. Leave empty to set it up later — the widget will show as offline.</p>
            </div>
            <div><Label>Main color</Label><Input type="color" value={form.primary_color} onChange={set("primary_color")} className="h-10" /></div>
            <div>
              <Label>Theme</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.theme} onChange={set("theme")}>
                <option value="light">Light</option><option value="dark">Dark</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Allowed websites (optional)</Label>
              <Input value={form.allowed_origins} onChange={set("allowed_origins")} placeholder="https://mysite.com, https://shop.mysite.com" />
              <p className="mt-1 text-xs text-muted-foreground">Only these websites can use the widget. Empty = any website.</p>
            </div>
            <div className="md:col-span-2"><Button type="submit">Create widget</Button></div>
          </form>
        )}
      </Card>

      <div className="space-y-4">
        {widgets.data?.map((w) => {
          const code = widgetSnippet(PUBLIC_BASE_URL, w.id);
          return (
            <Card key={w.id} className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="font-semibold">{w.name}</span>
                <Badge variant={w.inference_url ? "default" : "secondary"}>{w.inference_url ? "Connected" : "Offline"}</Badge>
                {!w.is_active && <Badge variant="outline">Paused</Badge>}
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => update(w.id, { is_active: !w.is_active })}>{w.is_active ? "Pause" : "Resume"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(w.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Input defaultValue={w.inference_url ?? ""} placeholder="https://llm.yourserver.com" id={`url-${w.id}`} />
                <Button size="sm" variant="secondary" onClick={() => {
                  const v = (document.getElementById(`url-${w.id}`) as HTMLInputElement).value.trim();
                  if (v && !isSafeInferenceUrl(v)) return toast.error("Must be a public https:// address");
                  update(w.id, { inference_url: v || null }).then(() => toast.success("Saved"));
                }}>Save server</Button>
              </div>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">{code}</pre>
              <Button size="sm" onClick={() => { navigator.clipboard.writeText(code); toast.success("Code copied"); }}>
                <Copy className="mr-2 h-4 w-4" /> Copy website code
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
