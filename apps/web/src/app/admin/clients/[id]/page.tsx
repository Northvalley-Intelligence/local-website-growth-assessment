import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "../../../../lib/client-store";
import { resolveGoogleMapsApiKey } from "../../../../lib/google-prefill";
import { ClientForm } from "../client-form";

export const dynamic = "force-dynamic";

const PREFILL_MESSAGES: Record<string, string> = {
  ok: "Prefilled from Google (empty fields only).",
  nokey: "GOOGLE_MAPS_API_KEY not configured",
  notfound: "No matching Google place was found.",
  upstream403: "Google refused the request (403).",
  upstream400: "Google rejected the request (400)."
};

export default async function EditClientPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ prefill?: string }>;
}) {
  const { id } = await params;
  const { prefill } = await searchParams;
  const client = await getClient(id);
  if (!client) notFound();
  const keyConfigured = Boolean(resolveGoogleMapsApiKey());

  return (
    <main>
      <section className="report-shell">
        <Link className="text-link" href="/admin/clients">
          Clients
        </Link>
        <p className="eyebrow">Admin</p>
        <h1>{client.displayName}</h1>
        <p>
          <Link
            className="text-link"
            href={`/admin/clients/${client.id}/listings/apple`}
          >
            Apple listing sheet
          </Link>
        </p>
        {prefill ? (
          <p className={prefill === "ok" ? "summary" : "form-error"}>
            {PREFILL_MESSAGES[prefill] ?? `Prefill failed (${prefill}).`}
          </p>
        ) : null}
        <form
          method="post"
          action={`/api/clients/${client.id}/prefill`}
          className="prefill-form"
        >
          <button type="submit" disabled={!keyConfigured}>
            Prefill from Google
          </button>
          <p className="disclaimer">
            {keyConfigured
              ? "Uses one Google Place Details call (billable, ~$0.02). Fills only empty fields."
              : "GOOGLE_MAPS_API_KEY not configured"}
          </p>
        </form>
        <ClientForm client={client} action={`/api/clients/${client.id}`} />
      </section>
    </main>
  );
}
