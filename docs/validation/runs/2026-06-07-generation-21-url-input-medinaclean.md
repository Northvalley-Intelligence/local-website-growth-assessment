# Validation Run: Generation 21 Medina Clean URL Input

## Run Metadata

- Phase: Phase 1.
- Generation: 21.
- Date: 2026-06-07.
- Operator: Codex.
- Site: Medina Clean.
- Input tested: `medinaclean.com`.
- Purpose: investigate Critical usability failure where a normal business domain without `https://` was rejected.

## Validation Failure

- Site: `medinaclean.com`
- Category: URL Input Usability and Safe Normalization.
- Issue type: Critical usability false negative.
- Discovered through: founder manual testing.
- Impact: a non-technical business owner could not submit a normal business domain, blocking the assessment before crawling or report generation.

## Root Cause

- The shared URL validation schema required a fully qualified URL via URL parsing.
- The web input used `type="url"`, which allowed the browser to reject a normal domain before the API could normalize it.
- The API error message still told users to enter a URL starting with `http://` or `https://`.

## Fix

- Shared validation now normalizes safe bare domains to HTTPS.
- `medinaclean.com` normalizes to `https://medinaclean.com/`.
- `www.medinaclean.com` normalizes to `https://www.medinaclean.com/`.
- Full `https://medinaclean.com` remains accepted.
- Invalid schemes such as `file://`, `javascript:`, `data:`, and `ftp://` remain rejected.
- Localhost and private IPs remain rejected.
- The UI input now uses text input with URL input mode so browser validation does not block normal business-domain input.
- The API validation message now says: `Please enter a public business website, like example.com or https://example.com.`

## Self-QA Results

Local API checks against `http://127.0.0.1:3105/api/scans`:

- `medinaclean.com`: `202 Accepted`, queued scan.
- `www.medinaclean.com`: `202 Accepted`, queued scan.
- `https://medinaclean.com`: `202 Accepted`, queued scan.
- `javascript:alert(1)`: `400 Bad Request`.
- `localhost:3000`: `400 Bad Request`.

Automated checks:

- Format passed.
- Lint passed.
- Typecheck passed.
- Unit tests passed: 26.
- Integration tests passed: 6.
- Build passed with the known Turbopack filesystem-store warning.

## Detection Accuracy

- True positives: normal public business domains accepted and normalized.
- True negatives: unsafe schemes and local/private hosts rejected.
- False positives: none observed after fix.
- False negatives: original `medinaclean.com` rejection fixed.

## Remaining Notes

- The system normalizes bare domains to HTTPS. HTTP fallback remains a future enhancement if a public site fails HTTPS but works over HTTP.
- Production still must reject localhost/private/internal addresses.
