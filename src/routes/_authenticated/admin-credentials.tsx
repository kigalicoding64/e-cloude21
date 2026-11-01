import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Copy, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getCredentialInventory } from "@/lib/credentials.functions";

export const Route = createFileRoute("/_authenticated/admin-credentials")({
  head: () => ({ meta: [
    { title: "Credentials — E-Cloud Admin" },
    { name: "description", content: "Administrator inventory of E-Cloud connection credentials and integration configuration status." },
    { property: "og:title", content: "Credentials — E-Cloud Admin" },
    { property: "og:description", content: "Secure E-Cloud credential inventory for administrators." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw redirect({ to: "/auth" });
    const { data, error } = await supabase.rpc("has_role", { _user_id: user.user.id, _role: "admin" });
    if (error || !data) throw redirect({ to: "/dashboard" });
  },
  component: CredentialsPage,
});

function CredentialsPage() {
  const getInventory = useServerFn(getCredentialInventory);
  const { data, isPending, isError, isFetching, refetch } = useQuery({
    queryKey: ["admin-credentials"],
    queryFn: () => getInventory(),
    retry: false,
  });
  async function copyName(name: string) {
    try { await navigator.clipboard.writeText(name); toast.success("Credential name copied"); }
    catch { toast.error("Could not copy credential name"); }
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <Button asChild variant="ghost" size="sm" className="mb-5"><Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Admin panel</Link></Button>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 font-display text-3xl font-bold"><KeyRound className="h-7 w-7 text-primary" />Credentials</h1>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">Private values are never displayed. Platform-managed credentials cannot be exported.</p>
      {isPending ? <p role="status">Checking configuration…</p> : isError ? (
        <p role="alert" className="text-destructive">Unable to check credentials. Confirm administrator access and try again.</p>
      ) : (
        <div className="overflow-x-auto border-y border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-muted-foreground"><tr>{["Credential", "Used for", "Access", "Status", ""].map((label, i) => <th key={i} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
            <tbody>{data?.map((row) => <tr key={row.name} className="border-t border-border">
              <td className="px-4 py-4 font-mono text-xs">{row.name}</td>
              <td className="px-4 py-4">{row.purpose}</td>
              <td className="px-4 py-4 text-muted-foreground">{row.kind}</td>
              <td className="px-4 py-4"><Badge variant={row.status === "Configured" ? "secondary" : "outline"}>{row.status}</Badge></td>
              <td className="px-4 py-4"><Button variant="ghost" size="icon" aria-label={`Copy name ${row.name}`} title="Copy credential name" onClick={() => copyName(row.name)}><Copy className="h-4 w-4" /></Button></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      <section className="mt-8 border-t border-border pt-6">
        <h2 className="font-display text-lg font-semibold">Account credentials</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><h3 className="text-sm font-medium">E-Cloud API keys</h3><p className="mt-1 text-sm text-muted-foreground">Stored as one-way hashes. Existing values cannot be retrieved.</p></div>
          <div><h3 className="text-sm font-medium">Sign-in application secrets</h3><p className="mt-1 text-sm text-muted-foreground">Stored as one-way hashes. Rotate in Sign-in Apps.</p></div>
          <div><h3 className="text-sm font-medium">Session and signing credentials</h3><p className="mt-1 text-sm text-muted-foreground">Protected server credentials. Values are not available here.</p></div>
        </div>
      </section>
    </div>
  );
}