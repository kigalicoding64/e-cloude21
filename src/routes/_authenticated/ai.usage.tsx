import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/ai/usage")({
  head: () => ({
    meta: [
      { title: "AI Usage — E-Cloud" },
      { name: "description", content: "Request counts, response times and estimated cost per AI provider key and model." },
    ],
  }),
  component: UsagePage,
});

type Row = {
  key_id: string | null;
  provider: string;
  model: string;
  status: number;
  latency_ms: number;
  estimated_cost_usd: number | null;
};

type Group = { label: string; count: number; errors: number; avg: number; max: number; cost: number; unknown: number };

function group(rows: Row[], keyOf: (r: Row) => string): Group[] {
  const map = new Map<string, Row[]>();
  for (const r of rows) map.set(keyOf(r), [...(map.get(keyOf(r)) ?? []), r]);
  return [...map.entries()]
    .map(([label, rs]) => ({
      label,
      count: rs.length,
      errors: rs.filter((r) => r.status >= 400).length,
      avg: Math.round(rs.reduce((s, r) => s + r.latency_ms, 0) / rs.length),
      max: Math.max(...rs.map((r) => r.latency_ms)),
      cost: rs.reduce((s, r) => s + Number(r.estimated_cost_usd ?? 0), 0),
      unknown: rs.filter((r) => r.estimated_cost_usd == null).length,
    }))
    .sort((a, b) => b.count - a.count);
}

function UsagePage() {
  const [days, setDays] = useState("7");
  const { data, isLoading } = useQuery({
    queryKey: ["ai-usage", days],
    queryFn: async () => {
      const since = new Date(Date.now() - Number(days) * 86_400_000).toISOString();
      const [{ data: reqs, error }, { data: keys }] = await Promise.all([
        supabase
          .from("ai_provider_requests")
          .select("key_id, provider, model, status, latency_ms, estimated_cost_usd")
          .gte("created_at", since)
          .limit(5000),
        supabase.from("ai_provider_keys").select("id, label, provider"),
      ]);
      if (error) throw error;
      return { reqs: (reqs ?? []) as Row[], keys: keys ?? [] };
    },
  });
  const rows = data?.reqs ?? [];
  const keyName = (id: string | null) => {
    const k = data?.keys.find((x) => x.id === id);
    return k ? `${k.label || "Unnamed"} (${k.provider})` : "Deleted key";
  };
  const total = group(rows, () => "all")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">AI Usage</h1>
          <p className="text-sm text-muted-foreground">Requests made through your one-key AI address.</p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last 24 hours</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Requests" value={String(total?.count ?? 0)} />
        <Stat label="Errors" value={String(total?.errors ?? 0)} />
        <Stat label="Avg response" value={`${total?.avg ?? 0} ms`} />
        <Stat label="Est. cost" value={`$${(total?.cost ?? 0).toFixed(4)}`} />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">No AI requests in this period yet.</Card>
      ) : (
        <>
          <Table title="By provider key" groups={group(rows, (r) => keyName(r.key_id))} />
          <Table title="By model" groups={group(rows, (r) => `${r.provider}/${r.model}`)} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </Card>
  );
}

function Table({ title, groups }: { title: string; groups: Group[] }) {
  return (
    <Card className="overflow-x-auto p-4">
      <h2 className="mb-3 font-medium">{title}</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="py-1">Name</th><th>Requests</th><th>Errors</th><th>Avg ms</th><th>Slowest ms</th><th>Est. cost</th></tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.label} className="border-t border-border">
              <td className="py-2 pr-2 font-mono text-xs">{g.label}</td>
              <td>{g.count}</td>
              <td>{g.errors}</td>
              <td>{g.avg}</td>
              <td>{g.max}</td>
              <td>{g.unknown === g.count ? "unknown" : `$${g.cost.toFixed(4)}${g.unknown ? "*" : ""}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted-foreground">* some requests had no known price or were streamed, so their cost isn't counted.</p>
    </Card>
  );
}
