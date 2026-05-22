/** Canonical app URL for links in emails and redirects. */
export function getAppUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  if (explicit) return explicit;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
