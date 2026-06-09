# API Surface

Phase 1 exposes a small JSON API used by the web UI and suitable for staging validation.

## Current Endpoints

### Create Assessment

`POST /api/scans`

Body:

```json
{
  "url": "example.com"
}
```

Response:

```json
{
  "scanId": "example-com-1780945882193",
  "status": "pending",
  "statusUrl": "/api/scans/example-com-1780945882193",
  "reportUrl": "/reports/example-com-1780945882193"
}
```

The submit request queues assessment work and returns immediately. Long-running crawl, extraction, scoring, PageSpeed, and report generation happen asynchronously.

### List Assessments

`GET /api/scans`

Returns recent scan jobs visible to the current deployment store.

### Get Assessment Status And Report JSON

`GET /api/scans/:id`

Returns the scan status: `pending`, `running`, `completed`, `failed`, or `insufficient_evidence`.

When status is `completed`, the response includes the report JSON.

### View Report

`GET /reports/:id`

Renders the customer-facing report page.

## Not Yet External-API Ready

Before third parties or production customers depend on this API, Phase 2 or production-readiness work must add:

- Durable deployment-compatible scan storage.
- Authentication or signed access for scan history and report retrieval.
- Rate limiting and abuse protection.
- Explicit API versioning.
- Retention policy enforcement.
- Scheduled recurring scans.
- Downloadable branded PDF reports.

## Current Download Behavior

Phase 1 supports report viewing in HTML and report retrieval as JSON through `GET /api/scans/:id`.

Branded PDF export is planned for Phase 2.
