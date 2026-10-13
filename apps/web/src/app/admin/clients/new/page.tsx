import Link from "next/link";
import { ClientForm } from "../client-form";

export const dynamic = "force-dynamic";

export default function NewClientPage() {
  return (
    <main>
      <section className="report-shell">
        <Link className="text-link" href="/admin/clients">
          Clients
        </Link>
        <p className="eyebrow">Admin</p>
        <h1>Add client</h1>
        <ClientForm action="/api/clients" />
      </section>
    </main>
  );
}
