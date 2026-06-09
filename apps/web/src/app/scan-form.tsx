"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

export function ScanForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url })
      });
      const payload = (await response.json()) as { scanId?: string; error?: string };

      if (!response.ok || !payload.scanId) {
        setError(payload.error ?? "The assessment could not be queued.");
        return;
      }

      router.push(`/reports/${payload.scanId}`);
    } catch {
      setError("The assessment could not start. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="scan-form" onSubmit={submit}>
      <label htmlFor="website-url">Website URL</label>
      <div className="url-row">
        <input
          id="website-url"
          name="url"
          inputMode="url"
          placeholder="example-business.com"
          type="text"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          required
        />
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Queuing..." : "Assess Website"}
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
