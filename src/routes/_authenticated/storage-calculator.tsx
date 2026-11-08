import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/format";
import { compareProviders, summarizeUsage, TIERS, GB } from "@/lib/storage-usage";
import { PUBLIC_BASE_URL } from "@/lib/site";

export const Route = createFileRoute("/_authenticated/storage-calculator")({
  head: () => ({ meta: [
    { title: "Storage Usage Calculator — E-Cloud" },
    { name: "description", content: "Estimate storage cost, forecast quota and plan your E-Cloud tier." },
    { property: "og:title", content: "Storage Usage Calculator — E-Cloud" },
    { property: "og:description", content: "Estimate storage cost, forecast quota and plan your E-Cloud tier." },
  ] }),
  component: Calculator,
});

function Calculator() {
  const { user } = useSession();
  const { data } = useQuery({
    queryKey: ["storage-calc", user?.id], enabled: !!user,
    queryFn: async () => {
      const [p, f] = await Promise.all([
        supabase.from("profiles").select("storage_used, storage_quota").eq("id", user!.id).maybeSingle(),
        supabase.from("files").select("size, mime_type, created_at").eq("user_id", user!.id).eq("is_trashed", false),
      ]);
      return summarizeUsage(f.data ?? [], Number(p.data?.storage_used ?? 0), Number(p.data?.storage_quota ?? 0));
    },
  });
  const [storageGb, setStorage] = useState(100);
  const [egressGb, setEgress] = useState(50);
  const [uploads, setUploads] = useState(10000);
  const rows = compareProviders({ storageGb, egressGb, uploadsPerMonth: uploads });
  const tier = TIERS.find((t) => t.id === data?.recommended_tier);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Storage usage &amp; planning</h1>
      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4"><div className="text-sm text-muted-foreground">Used</div>
            <div className="text-xl font-semibold">{formatBytes(data.used_bytes)} / {formatBytes(data.quota_bytes)}</div>
            <Progress value={data.percent_used} className="mt-2" /></Card>
          <Card className="p-4"><div className="text-sm text-muted-foreground">Growth (last 30 days)</div>
            <div className="text-xl font-semibold">{formatBytes(data.growth_bytes_per_day)}/day</div>
            <div className="text-sm">{data.days_until_full === null ? "Not growing" : `Full in ~${data.days_until_full} days`}</div></Card>
          <Card className="p-4"><div className="text-sm text-muted-foreground">Recommended plan (12 months)</div>
            <div className="text-xl font-semibold">{tier?.label}</div>
            <div className="text-sm">{tier && formatBytes(tier.quotaGb * GB)} quota</div></Card>
        </div>
      )}
      <Card className="space-y-4 p-4">
        <h2 className="font-semibold">Cost calculator</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div><Label>Stored (GB)</Label><Input type="number" min={0} value={storageGb} onChange={(e) => setStorage(+e.target.value)} /></div>
          <div><Label>Downloads per month (GB)</Label><Input type="number" min={0} value={egressGb} onChange={(e) => setEgress(+e.target.value)} /></div>
          <div><Label>Uploads per month</Label><Input type="number" min={0} value={uploads} onChange={(e) => setUploads(+e.target.value)} /></div>
        </div>
        <table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th>Provider</th><th>Monthly</th><th>Yearly</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id} className="border-t"><td className="py-2">{r.label}</td><td>${r.monthly.toFixed(2)}</td><td>${r.yearly.toFixed(2)}</td></tr>)}</tbody></table>
        <p className="text-xs text-muted-foreground">Estimates use approximate public list prices.</p>
      </Card>
      <Card className="space-y-2 p-4 text-sm">
        <h2 className="font-semibold">New storage API</h2>
        <code className="block">GET {PUBLIC_BASE_URL}/api/public/v1/storage/usage?egress_gb=50</code>
        <code className="block">POST {PUBLIC_BASE_URL}/api/public/v1/files/import-url {"{"} "url": "https://…" {"}"}</code>
        <code className="block">POST {PUBLIC_BASE_URL}/api/public/v1/files/batch {"{"} "action": "move|trash|restore|delete", "ids": [...] {"}"}</code>
      </Card>
    </div>
  );
}
