import { disclaimer, scoringWeights } from "@northvalleyintel/assessment-shared";
import Link from "next/link";
import { ScanForm } from "./scan-form";

export default function HomePage() {
  const categories = Object.keys(scoringWeights);

  return (
    <main>
      <section className="shell">
        <p className="eyebrow">North Valley Intel</p>
        <h1>Local Website Growth Assessment</h1>
        <p className="summary">
          Find out why a local business website may not be turning visitors into calls,
          bookings, or estimate requests.
        </p>
        <ScanForm />
        <dl className="facts">
          <div>
            <dt>Current phase</dt>
            <dd>Phase 1: Complete Vertical Slice</dd>
          </div>
          <div>
            <dt>Scoring categories</dt>
            <dd>{categories.length}</dd>
          </div>
          <div>
            <dt>Crawl policy</dt>
            <dd>Public pages only</dd>
          </div>
        </dl>
        <Link className="text-link" href="/admin">
          View scan history
        </Link>
        <p className="disclaimer">{disclaimer}</p>
      </section>
    </main>
  );
}
