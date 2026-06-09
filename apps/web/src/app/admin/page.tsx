import { listAssessmentJobs } from "../../lib/scan-store";
import Link from "next/link";

export default async function AdminPage() {
  const scans = await listAssessmentJobs();

  return (
    <main>
      <section className="report-shell">
        <Link className="text-link" href="/">
          New assessment
        </Link>
        <p className="eyebrow">Admin</p>
        <h1>Scan History</h1>
        {scans.length === 0 ? (
          <p className="summary">No scans have run in this local session yet.</p>
        ) : (
          <div className="score-table">
            {scans.map((scan) => (
              <article key={scan.id} className="score-row">
                <div>
                  <h2>{scan.domain}</h2>
                  <p>
                    {scan.createdAt} · {scan.status}
                  </p>
                </div>
                <Link className="text-link" href={`/reports/${scan.id}`}>
                  View report
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
