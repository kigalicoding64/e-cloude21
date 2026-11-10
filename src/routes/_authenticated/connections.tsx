import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { generateApiKey, sha256Hex } from "@/lib/hash";
import { PUBLIC_BASE_URL } from "@/lib/site";
import { connectionEnvironment, connectionExample, connectionKeyScopes, type ConnectionKeyKind } from "@/lib/developer-connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/connections")({
  head: () => ({ meta: [
    { title: "Developer Connections — E-Cloud" },
    { name: "description", content: "Create owner-scoped E-Cloud connection keys and copy server connection settings." },
    { property: "og:title", content: "Developer Connections — E-Cloud" },
    { property: "og:description", content: "Secure connection settings for your E-Cloud applications." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ConnectionsPage,
});

function ConnectionsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ConnectionKeyKind>("read-only");
  const [key, setKey] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!key) return;
    const timer = setTimeout(() => { setKey(null); setVisible(false); }, 60_000);
    return () => clearTimeout(timer);
  }, [key]);

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to create a key.");
      const label = name.trim();
      if (!label || label.length > 60) throw new Error("Enter a name between 1 and 60 characters.");
      const token = generateApiKey();
      const { error } = await supabase.from("api_keys").insert({
        user_id: user.id, name: label, key_hash: await sha256Hex(token), key_prefix: token.slice(0, 16), scopes: connectionKeyScopes(kind),
      });
      if (error) throw error;
      return token;
    },
    onSuccess: token => { setKey(token); setVisible(false); setName(""); qc.invalidateQueries({ queryKey: ["api-keys"] }); },
    onError: (error: Error) => toast.error(error.message),
  });

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); toast.success("Copied"); }
    catch { toast.error("Clipboard unavailable. Select and copy the text instead."); }
  }

  return <div className="mx-auto max-w-4xl px-4 py-10 sm:px-8">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-display text-3xl font-bold">Developer connections</h1>
      <Button variant="outline" asChild><Link to="/api-keys">Manage keys</Link></Button>
    </div>
    <section className="border-y border-border py-6">
      <Label>Project URL</Label>
      <div className="mt-2 flex items-center gap-2"><code className="min-w-0 flex-1 break-all font-mono text-sm">{PUBLIC_BASE_URL}</code><Button size="icon" variant="ghost" aria-label="Copy project URL" onClick={() => copy(PUBLIC_BASE_URL)}><Copy className="h-4 w-4" /></Button></div>
    </section>
    <section className="py-8">
      <h2 className="mb-5 text-lg font-semibold">Create connection key</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="connection-name">Key name</Label><Input id="connection-name" maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Production server" /></div>
        <div className="space-y-2"><Label>Access</Label><Select value={kind} onValueChange={v => { if (v === "server" || v === "read-only") setKind(v); }}><SelectTrigger aria-label="Key access"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="read-only">Read-only</SelectItem><SelectItem value="server">Server · read & write</SelectItem></SelectContent></Select></div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Owner-only access. Keep both key types on your server. Neither grants access to another account or bypasses security rules.</p>
      <Button className="mt-5 gap-2" disabled={create.isPending || !name.trim()} onClick={() => create.mutate()}><KeyRound className="h-4 w-4" />{create.isPending ? "Creating…" : "Generate connection key"}</Button>
    </section>
    <section className="border-t border-border py-8">
      <h2 className="mb-4 text-lg font-semibold">Server connection</h2>
      <div className="relative"><pre className="overflow-x-auto rounded-md bg-muted p-4 pr-12 text-xs"><code>{connectionExample()}</code></pre><Button variant="ghost" size="icon" className="absolute right-1 top-1" aria-label="Copy server example" onClick={() => copy(connectionExample())}><Copy className="h-4 w-4" /></Button></div>
      <p className="mt-4 text-sm text-muted-foreground">E-Cloud REST API only. Compatibility with other platforms’ authentication, database and storage SDKs is not available yet.</p>
    </section>
    <Dialog open={key !== null} onOpenChange={open => { if (!open) { setKey(null); setVisible(false); } }}><DialogContent>
      <DialogHeader><DialogTitle>Save your new key</DialogTitle><DialogDescription>Shown once, cleared after one minute. Closing this window removes the value; create another key if you lose it.</DialogDescription></DialogHeader>
      <div className="flex items-center gap-2 rounded-md bg-muted p-3"><code className="min-w-0 flex-1 break-all text-xs">{visible ? key : "••••••••••••••••••••••••"}</code><Button size="icon" variant="ghost" aria-label={visible ? "Hide new key" : "Show new key"} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button></div>
      <div className="flex flex-wrap gap-2"><Button onClick={() => { if (key) copy(key); }}><Copy className="mr-2 h-4 w-4" />Copy key</Button><Button variant="outline" onClick={() => { if (key) copy(connectionEnvironment(key)); }}>Copy .env settings</Button></div>
    </DialogContent></Dialog>
  </div>;
}