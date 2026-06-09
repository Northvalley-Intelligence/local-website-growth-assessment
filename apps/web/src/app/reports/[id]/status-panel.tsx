"use client";

import type { AssessmentJob } from "@northvalleyintel/assessment-shared";
import Link from "next/link";
import { useEffect, useState } from "react";

export function AssessmentStatusPanel({ initialJob }: { initialJob: AssessmentJob }) {
  const [job, setJob] = useState(initialJob);

  useEffect(() => {
    if (
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "insufficient_evidence"
    ) {
      return;
    }

    const interval = setInterval(async () => {
      const response = await fetch(`/api/scans/${job.id}`);
      if (!response.ok) return;
      const payload = (await response.json()) as { scan: AssessmentJob };
      setJob(payload.scan);

      if (payload.scan.status === "completed") {
        window.location.reload();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [job.id, job.status]);

  return (
    <section className="report-shell">
      <Link className="text-link" href="/">
        New assessment
      </Link>
      <p className="eyebrow">Assessment status</p>
      <h1>{job.domain}</h1>
      <p className="summary">
        Status: <strong>{job.status}</strong>
      </p>
      {job.status === "pending" ? (
        <p>The assessment has been queued and will start shortly.</p>
      ) : null}
      {job.status === "running" ? (
        <p>The assessment is running. The report will appear after it completes.</p>
      ) : null}
      {job.status === "failed" ? (
        <p className="form-error">
          The assessment failed: {job.error ?? "No error details were provided."}
        </p>
      ) : null}
      {job.status === "insufficient_evidence" ? (
        <p className="form-error">
          The assessment could not produce a trustworthy report:{" "}
          {job.error ?? "Not enough public website evidence was collected."}
        </p>
      ) : null}
    </section>
  );
}
