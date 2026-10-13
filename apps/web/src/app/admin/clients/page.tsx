import Link from "next/link";
import { listClients } from "../../../lib/client-store";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listClients();

  return (
    <main>
      <section className="report-shell">
        <Link className="text-link" href="/admin">
          Scan history
        </Link>
        <p className="eyebrow">Admin</p>
        <h1>Clients</h1>
        <p>
          <Link className="text-link" href="/admin/clients/new">
            Add client
          </Link>
        </p>
        {clients.length === 0 ? (
          <p className="summary">No clients yet.</p>
        ) : (
          <div className="score-table">
            {clients.map((client) => {
              const apple = client.listings.apple?.status ?? "not_started";
              return (
                <article key={client.id} className="score-row">
                  <div>
                    <h2>{client.displayName}</h2>
                    <p>
                      {client.address.city ?? "No city"} · {client.phone ?? "No phone"}{" "}
                      · Apple:{" "}
                      <span className="status-chip">{apple.replace(/_/g, " ")}</span>
                    </p>
                  </div>
                  <Link className="text-link" href={`/admin/clients/${client.id}`}>
                    Open
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
