
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { listProjectSecrets } from "@/lib/secrets.functions";

export const Route = createFileRoute("/_authenticated/developer/secrets")({
  head: () => ({
    meta: [
      { title: "Project secrets — EGREED Identity" },
      {
        name: "description",
        content:
          "See which secrets EGREED Identity uses and whether each is configured.",
      },
      {
        property: "og:title",
        content: "Project secrets — EGREED Identity",
      },
      {
        property: "og:description",
        content:
          "See which secrets EGREED Identity uses and whether each is configured.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecretsPage,
});

function SecretsPage() {
  const fetchSecrets = useServerFn(listProjectSecrets);

  const [revealed, setRevealed] = useState(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const {
    data,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["developer", "secrets"],
    queryFn: () => fetchSecrets(),
    retry: false,
  });

  const copyName = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopied(name);
      toast.success("Credential name copied");
    } catch {
      toast.error("Could not copy credential name");
    }
  };

  const copyValue = async (name: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(name);
      toast.success("Public connection value copied");
    } catch {
      toast.error("Could not copy connection value");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 font-display text-3xl font-semibold tracking-tight">
            <KeyRound className="size-7 text-primary" />
            Project secrets
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Every secret this platform reads on the server. Values are masked
            by default — reveal public values only in a private place, and
            never share private keys.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 size-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRevealed((v) => !v)}
            aria-pressed={revealed}
          >
            {revealed ? (
              <EyeOff className="mr-2 size-4" />
            ) : (
              <Eye className="mr-2 size-4" />
            )}
            {revealed ? "Hide all" : "Reveal names"}
          </Button>
        </div>
      </header>

      {isPending ? (
        <div className="space-y-3" role="status">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <span className="sr-only">Checking configuration…</span>
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="space-y-3 rounded-lg border border-destructive/30 p-5"
        >
          <p className="font-medium text-destructive">
            Unable to check project secrets.
          </p>
          <p className="text-sm text-muted-foreground">
            Confirm administrator access and server configuration, then try
            again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className="mr-2 size-4" />
            Try again
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((s) => {
            const isVisible = revealed || Boolean(visible[s.name]);
            const canReveal = !s.sensitive && Boolean(s.value);

            return (
              <li
                key={s.name}
                className="surface-panel flex flex-wrap items-start gap-4 p-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-semibold">
                      {isVisible || revealed
                        ? s.name
                        : `${s.name.slice(0, 2)}••••${s.name.slice(-2)}`}
                    </p>

                    {s.sensitive && (
                      <Badge variant="destructive">Private</Badge>
                    )}

                    {!s.sensitive && (
                      <Badge variant="outline">Public</Badge>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {s.purpose}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <code className="max-w-full break-all rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                      {s.sensitive
                        ? "•••••••• (hidden)"
                        : isVisible
                          ? s.value ?? "Not set"
                          : s.maskedValue ?? "Not set"}
                    </code>

                    {canReveal && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={`${isVisible ? "Hide" : "Show"} ${s.name}`}
                          aria-pressed={isVisible}
                          onClick={() =>
                            setVisible((current) => ({
                              ...current,
                              [s.name]: !current[s.name],
                            }))
                          }
                        >
                          {isVisible ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label={`Copy public value ${s.name}`}
                          onClick={() => copyValue(s.name, s.value!)}
                        >
                          {copied === s.name ? (
                            <Check className="size-4" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </Button>
                      </div>
                    )}

                    {s.sensitive && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <LockKeyhole className="size-4" />
                        <span className="text-xs">
                          Private value is never exposed
                        </span>
                      </div>
                    )}

                    {!s.sensitive && !s.value && (
                      <span className="text-xs text-muted-foreground">
                        No public value available
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={s.configured ? "secondary" : "outline"}
                  >
                    {s.configured ? "Configured" : "Not set"}
                  </Badge>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Copy credential name ${s.name}`}
                    title="Copy credential name"
                    onClick={() => copyName(s.name)}
                  >
                    {copied === s.name ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="space-y-4 border-t border-border pt-6">
        <div>
          <h2 className="font-display text-lg font-semibold">
            Account credentials
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Additional security information about credentials managed by
            EGREED Identity.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="surface-panel p-4">
            <h3 className="text-sm font-medium">E-Cloud API keys</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Stored as one-way hashes. Existing values cannot be retrieved.
            </p>
          </div>

          <div className="surface-panel p-4">
            <h3 className="text-sm font-medium">
              Sign-in application secrets
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Stored as one-way hashes. Rotate in Sign-in Apps.
            </p>
          </div>

          <div className="surface-panel p-4">
            <h3 className="text-sm font-medium">
              Session and signing credentials
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Protected server credentials. Values are not available here.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
