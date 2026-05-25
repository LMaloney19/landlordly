"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createTenantPortalInvite,
  getTenantPortalAccessStatus,
  resetTenantPortalAccess,
  type TenantPortalAccessState,
} from "@/app/actions/tenant-portal";

type TenantPortalInviteCardProps = {
  tenantId: string;
  tenantEmail: string | null;
  portalLinked: boolean;
  portalLinkedAt: string | null;
};

function formatPortalDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(state: TenantPortalAccessState, loading: boolean) {
  if (loading) return "…";
  if (state === "active") return "Active";
  if (state === "pending") return "Waiting for tenant signup";
  return "Not set up";
}

export function TenantPortalInviteCard({
  tenantId,
  tenantEmail,
  portalLinked,
  portalLinkedAt,
}: TenantPortalInviteCardProps) {
  const [state, setState] = useState<TenantPortalAccessState>(
    portalLinked ? "active" : "not_enabled",
  );
  const [accessUrl, setAccessUrl] = useState<string | null>(null);
  const [linkedAt, setLinkedAt] = useState<string | null>(portalLinkedAt);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      const result = await getTenantPortalAccessStatus(tenantId);
      if (cancelled) return;

      setLoadingStatus(false);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setState(result.data.state);
      setAccessUrl(result.data.accessUrl);
      setLinkedAt(result.data.linkedAt ?? portalLinkedAt);
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [tenantId, portalLinkedAt]);

  function handleEnableAccess() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await createTenantPortalInvite(tenantId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setState("pending");
      setAccessUrl(result.data.url);
    });
  }

  async function handleCopy() {
    let url = accessUrl;
    if (!url && state !== "active") {
      const result = await createTenantPortalInvite(tenantId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      url = result.data.url;
      setState("pending");
      setAccessUrl(url);
    }
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Could not copy — select the link and copy manually.");
    }
  }

  function handleResetAccess() {
    if (
      !window.confirm(
        "Reset portal access? The tenant will need a new link to sign up again, and their current portal login will be unlinked.",
      )
    ) {
      return;
    }

    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await resetTenantPortalAccess(tenantId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setState(tenantEmail ? "not_enabled" : "not_enabled");
      setAccessUrl(null);
      setLinkedAt(null);
    });
  }

  const linkedLabel = linkedAt ? formatPortalDate(linkedAt) : null;

  const statusStyles =
    state === "active"
      ? "bg-emerald-50 text-emerald-800"
      : state === "pending"
        ? "bg-amber-50 text-amber-900"
        : "bg-zinc-100 text-zinc-700";

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">Portal access link</h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles}`}
        >
          {statusLabel(state, loadingStatus)}
        </span>
      </div>

      <p className="mt-1 text-sm text-zinc-500">
        Send one stable link per tenant. After they create an account and open the link, they
        sign in at <span className="font-mono text-xs text-zinc-700">/portal</span> anytime —
        no new invites.
      </p>

      {state === "active" ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Linked{linkedLabel ? ` since ${linkedLabel}` : ""}. Tenant uses /login or /portal with
          their account.
        </p>
      ) : null}

      {state === "pending" ? (
        <p className="mt-4 text-sm text-zinc-600">
          Copy the same link anytime until the tenant finishes signup. The link does not change
          when you copy again.
        </p>
      ) : null}

      {state === "not_enabled" && !loadingStatus ? (
        <p className="mt-4 text-sm text-zinc-600">
          {tenantEmail
            ? "Enable portal access to create a link you can copy and send once."
            : "Add an email on this tenant before enabling portal access."}
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {state !== "active" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {state === "not_enabled" ? (
            <button
              type="button"
              onClick={handleEnableAccess}
              disabled={isPending || loadingStatus || !tenantEmail}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {isPending ? "Loading…" : "Enable portal access"}
            </button>
          ) : null}
          {state === "pending" || accessUrl ? (
            <button
              type="button"
              onClick={() => void handleCopy()}
              disabled={isPending || loadingStatus || !tenantEmail}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {copied ? "Copied" : "Copy portal access link"}
            </button>
          ) : null}
        </div>
      ) : null}

      {(state === "pending" || state === "active") && !loadingStatus ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleResetAccess}
            disabled={isPending}
            className="text-sm font-medium text-red-700 hover:text-red-800 disabled:opacity-60"
          >
            Reset access
          </button>
        </div>
      ) : null}

      {accessUrl && state === "pending" ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Portal access link
          </p>
          <p className="break-all rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700">
            {accessUrl}
          </p>
          <p className="text-xs text-zinc-500">Stays the same until the tenant signs up or you reset access.</p>
        </div>
      ) : null}
    </article>
  );
}
