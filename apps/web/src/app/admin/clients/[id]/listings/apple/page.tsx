import Link from "next/link";
import { notFound } from "next/navigation";
import { LISTING_STATUSES } from "../../../../../../lib/client-record";
import { getClient } from "../../../../../../lib/client-store";
import { prepareAppleSheet } from "../../../../../../lib/listing-platforms/apple";

export const dynamic = "force-dynamic";

const COPY_SCRIPT = `document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('.copy-button');if(!b)return;navigator.clipboard.writeText(b.getAttribute('data-copy')||'').then(function(){var t=b.textContent;b.textContent='Copied';setTimeout(function(){b.textContent=t},1200)});});`;

export default async function AppleSheetPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();
  const sheet = prepareAppleSheet(client);
  const listing = client.listings.apple;
  const missingInputs = sheet.steps
    .flatMap((s) => s.fields)
    .filter((f) => f.missing && f.key !== "hours");
  const hoursMissing = sheet.missingRequired.includes("hours");

  return (
    <main>
      <section className="report-shell">
        <Link className="text-link" href={`/admin/clients/${client.id}`}>
          {client.displayName}
        </Link>
        <p className="eyebrow">Apple Business Connect · Add single location</p>
        <h1>Apple listing sheet</h1>
        <p className="summary">
          Type these into Apple Business Connect in another tab and submit there.
          Nothing here contacts Apple.
        </p>

        <div
          className={
            sheet.eligibility.ok ? "sheet-banner" : "sheet-banner sheet-banner-warn"
          }
        >
          <strong>
            {sheet.eligibility.ok ? "Eligible to add" : "Check eligibility first"}
          </strong>
          {sheet.eligibility.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
          {sheet.missingRequired.length ? (
            <p>Missing required: {sheet.missingRequired.join(", ")}</p>
          ) : (
            <p>All required fields are filled.</p>
          )}
        </div>

        <form method="post" action={`/api/clients/${client.id}`}>
          <input
            type="hidden"
            name="_next"
            value={`/admin/clients/${client.id}/listings/apple`}
          />
          {sheet.steps.map((step, index) => (
            <section key={step.title} className="sheet-step">
              <h2>
                {index + 1}. {step.title}
              </h2>
              <table className="sheet-table">
                <tbody>
                  {step.fields.map((f) => (
                    <tr key={f.key} className={f.missing ? "missing-field" : undefined}>
                      <th scope="row">
                        {f.label}
                        {f.required ? " *" : ""}
                      </th>
                      <td>
                        {f.missing && f.key !== "hours" ? (
                          <input
                            name={f.key}
                            placeholder={`Enter ${f.label.toLowerCase()}`}
                          />
                        ) : f.missing ? (
                          <Link
                            className="text-link"
                            href={`/admin/clients/${client.id}`}
                          >
                            Enter hours on the client page
                          </Link>
                        ) : (
                          <span>{f.value ?? "—"}</span>
                        )}
                        {f.help ? <small className="sheet-help">{f.help}</small> : null}
                        {f.warnings.map((w) => (
                          <small key={w} className="sheet-warning">
                            {w}
                          </small>
                        ))}
                      </td>
                      <td>
                        {f.value && !f.missing ? (
                          <button
                            type="button"
                            className="copy-button"
                            data-copy={f.value}
                          >
                            Copy
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
          {missingInputs.length ? (
            <button type="submit">Save missing fields</button>
          ) : hoursMissing ? null : (
            <p className="disclaimer">Nothing missing.</p>
          )}
        </form>

        <section className="sheet-step">
          <h2>Listing status</h2>
          <p>
            Current:{" "}
            <span className="status-chip">
              {(listing?.status ?? "not_started").replace(/_/g, " ")}
            </span>
            {listing?.submittedAt ? ` · submitted ${listing.submittedAt}` : ""}
          </p>
          {listing?.missingAtSubmit.length ? (
            <p className="disclaimer">
              Missing when submitted: {listing.missingAtSubmit.join(", ")}
            </p>
          ) : null}
          <form
            className="scan-form"
            method="post"
            action={`/api/clients/${client.id}/listings/apple`}
          >
            <label className="client-field">
              <span>Status</span>
              <select name="status" defaultValue={listing?.status ?? "not_started"}>
                {LISTING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="client-field">
              <span>Apple location URL</span>
              <input name="listingUrl" defaultValue={listing?.listingUrl ?? ""} />
            </label>
            <label className="client-field">
              <span>Notes</span>
              <input name="notes" defaultValue={listing?.notes ?? ""} />
            </label>
            <button type="submit">Save status</button>
          </form>
        </section>
        <script dangerouslySetInnerHTML={{ __html: COPY_SCRIPT }} />
      </section>
    </main>
  );
}
