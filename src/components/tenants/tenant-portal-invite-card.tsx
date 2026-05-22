"use client";

import { useState, useTransition } from "react";
import { createTenantPortalInvite } from "@/app/actions/tenant-portal";

type TenantPortalInviteCardProps = {
  tenantId: string;
  tenantEmail: string | null;
  portalLinked: boolean;
  portalLinkedAt: string | null;
};

export function TenantPortalInviteCard({
  tenantId,
  tenantEmail,
  portalLinked,
  portalLinkedAt,
}: TenantPortalInviteCardProps) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCreateInvite() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await createTenantPortalInvite(tenantId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setInviteUrl(result.data.url);
      setExpiresAt(result.data.expiresAt);
    });
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setError("Could not copy — select the link and copy manually.");
    }
  }

  const linkedLabel = portalLinkedAt
    ? new Date(portalLinkedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">Tenant portal</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Tenants sign in to report maintenance and rent payments. Updates appear on your
        Maintenance and Rent pages automatically.
      </p>

      {portalLinked ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Portal active{linkedLabel ? ` since ${linkedLabel}` : ""}.
        </p>
      ) : (
        <p className="mt-4 text-sm text-zinc-600">
          {tenantEmail
            ? "Generate an invite link and send it to the tenant's email."
            : "Add an email on this tenant before inviting them to the portal."}
        </p>
      )}

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCreateInvite}
          disabled={isPending || !tenantEmail}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {isPending ? "Creating…" : portalLinked ? "New invite link" : "Create invite link"}
        </button>
        {inviteUrl ? (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        ) : null}
      </div>

      {inviteUrl ? (
        <div className="mt-4 space-y-2">
          <p className="break-all rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700">
            {inviteUrl}
          </p>
          {expiresAt ? (
            <p className="text-xs text-zinc-500">
              Expires{" "}
              {new Date(expiresAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
