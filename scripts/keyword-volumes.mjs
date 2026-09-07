#!/usr/bin/env node
// scripts/keyword-volumes.mjs
// ---------------------------------------------------------------------------
// Keyword Planner historical metrics -> demand-data.md (two geo lanes).
//
// Turns a demand-terms.md (ONE comma-separated line of keywords, per the
// complimentary-report skill step 4) into a demand-data.md table of Google
// Keyword Planner historical metrics, in two lanes:
//   Lane A - national baseline (geo: United States), caveated
//   Lane B - local demand (geo: Cobb County, GA + Douglas County, GA by default)
//
// Google Ads API REST via global fetch (default v25, override with
// GOOGLE_ADS_API_VERSION). Node built-ins only. No npm deps, no SDK. Secrets
// are read from an env file (default .env.local in CWD), held in memory only,
// and NEVER printed.
//
// Usage:
//   node scripts/keyword-volumes.mjs --terms <path> --out <path> \
//     [--json <path>] [--env <path>] \
//     [--local-geo "Cobb County, GA;Douglas County, GA"] \
//     [--national-geo "United States"] [--dry-run]
//
// Exit codes: 0 ok · 1 bad input / missing env · 2 Google Ads API failure.
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

// v21 is RETIRED (Google answers 404). v25 is the newest working version;
// GOOGLE_ADS_API_VERSION (env file or process env) overrides it.
export const DEFAULT_API_VERSION = "v25";
const API_VERSION_ENV_KEY = "GOOGLE_ADS_API_VERSION";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ADS_HOST = "https://googleads.googleapis.com";
const LANGUAGE_ENGLISH = "languageConstants/1000";
const KEYWORD_CHUNK_SIZE = 1000;
const MANAGER_HINT =
  "Set GOOGLE_ADS_CUSTOMER_ID to a client account id under MCC 7599028409 (digits only).";

const OPTIONAL_ENV_KEYS = ["GOOGLE_ADS_CUSTOMER_ID", API_VERSION_ENV_KEY];

const REQUIRED_ENV_KEYS = [
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_LOGIN_CUSTOMER_ID"
];

const DEFAULT_LOCAL_GEO = "Cobb County, GA;Douglas County, GA";
const DEFAULT_NATIONAL_GEO = "United States";

const NA = "—"; // em dash - the ONLY placeholder for a null/absent value
const MINUS = "−"; // true minus sign, per the demand-data.md contract
const EN_DASH = "–"; // bid range separator

// MonthOfYear enum NAMES, in calendar order (the API speaks these, not numbers).
const MONTH_NAMES = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER"
];

const MONTH_INDEX = Object.fromEntries(MONTH_NAMES.map((name, i) => [name, i + 1]));

// Google returns only 12 monthly points by default, so "same month last year"
// is never in the window and YoY can never be computed. Ask for 24.
const HISTORICAL_MONTHS = 24;

const COMPETITION_LEVELS = new Set(["LOW", "MEDIUM", "HIGH"]);

// --------------------------------------------------------------------------
// API version (env-overridable, resolved once per run)
// --------------------------------------------------------------------------

let apiVersion = DEFAULT_API_VERSION;

/** The API version this run will use. */
export function getApiVersion() {
  return apiVersion;
}

/** Set the API version for this run; blank/absent falls back to the default. */
export function setApiVersion(value) {
  apiVersion = String(value ?? "").trim() || DEFAULT_API_VERSION;
  return apiVersion;
}

/**
 * Resolve GOOGLE_ADS_API_VERSION from the parsed env (env file first, then the
 * process environment), falling back to DEFAULT_API_VERSION.
 */
export function resolveApiVersion(envVars = {}, procEnv = process.env) {
  const fromFile = String((envVars && envVars[API_VERSION_ENV_KEY]) ?? "").trim();
  if (fromFile) return fromFile;
  const fromProc = String((procEnv && procEnv[API_VERSION_ENV_KEY]) ?? "").trim();
  return fromProc || DEFAULT_API_VERSION;
}

/** Base URL for the Google Ads REST API at the version in use. */
export function adsBase(version = getApiVersion()) {
  return `${ADS_HOST}/${version}`;
}

// --------------------------------------------------------------------------
// Pure pieces (exported for tests)
// --------------------------------------------------------------------------

/**
 * Parse a demand-terms.md file body.
 * Contract: exactly ONE non-empty line, comma-separated terms.
 * Trims, drops empties, dedupes case-insensitively, preserves order.
 */
export function parseTerms(text) {
  const lines = String(text ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error("terms file is empty: expected ONE comma-separated line of terms");
  }
  if (lines.length > 1) {
    throw new Error(
      `terms file must be exactly ONE comma-separated line, found ${lines.length} non-empty lines`
    );
  }

  const seen = new Set();
  const terms = [];
  for (const raw of lines[0].split(",")) {
    const term = raw.trim();
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }

  if (terms.length === 0) {
    throw new Error("terms file contained no usable terms after trimming");
  }
  return terms;
}

/**
 * Signed percentage change, rounded to a whole percent.
 * Returns null (-> "—" in the table) when either side is missing or the base is 0.
 */
export function pctChange(current, base) {
  const cur = toNumber(current);
  const prev = toNumber(base);
  if (cur === null || prev === null) return null;
  if (prev === 0) return null;
  const rounded = Math.round((cur / prev - 1) * 100);
  const sign = rounded < 0 ? MINUS : "+";
  return `${sign}${Math.abs(rounded)}%`;
}

/**
 * The 24-month window to request from Keyword Planner:
 * end = the previous CALENDAR month (relative to `today`),
 * start = 23 months before that, so the window is 24 months inclusive and
 * every month in it has its counterpart one year earlier (YoY computable).
 * `month` values are MonthOfYear enum NAMES ("JANUARY" … "DECEMBER").
 */
export function yearMonthRangeFor(today = new Date()) {
  const endAbs = today.getFullYear() * 12 + today.getMonth() - 1; // getMonth() is 0-based
  return {
    start: absMonthToYearMonth(endAbs - (HISTORICAL_MONTHS - 1)),
    end: absMonthToYearMonth(endAbs)
  };
}

function absMonthToYearMonth(abs) {
  return {
    year: Math.floor(abs / 12),
    month: MONTH_NAMES[((abs % 12) + 12) % 12]
  };
}

/** "2024-SEPTEMBER → 2026-AUGUST" — for the dry-run summary. */
export function formatYearMonthRange(range) {
  const cell = (p) => `${p.year}-${p.month}`;
  return `${cell(range.start)} → ${cell(range.end)}`;
}

/**
 * Minimal .env parser (same style as get-google-ads-refresh-token.mjs):
 * skips blanks/comments, tolerates an `export ` prefix, strips matched quotes.
 * Never logs anything it reads.
 */
export function parseEnvFile(text) {
  const out = {};
  for (const raw of String(text ?? "").split("\n")) {
    let line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice("export ".length).trim();
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!key) continue;
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"') && val.length >= 2) ||
      (val.startsWith("'") && val.endsWith("'") && val.length >= 2)
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * Pick the geoTargetConstant that matches a requested location name.
 * "… County, GA" -> targetType County; "United States" -> targetType Country.
 * Throws (listing the candidates) when nothing matches - never guesses.
 */
export function pickGeoConstant(name, suggestions) {
  const requested = String(name ?? "").trim();
  const wantedType = /\bcounty\b/i.test(requested)
    ? "County"
    : /^united states$/i.test(requested)
      ? "Country"
      : null;

  const constants = (suggestions ?? [])
    .map((s) => (s && s.geoTargetConstant ? s.geoTargetConstant : s))
    .filter((c) => c && c.resourceName);

  const typed = wantedType
    ? constants.filter((c) => c.targetType === wantedType)
    : constants;

  if (typed.length === 0) {
    throw new Error(
      `No ${wantedType ?? "matching"} geo target found for "${requested}". Candidates: ` +
        (constants.length
          ? constants.map((c) => `${c.name} (${c.targetType})`).join(", ")
          : "(none returned)")
    );
  }

  const head = requested.split(",")[0].trim().toLowerCase();
  const exact = typed.find(
    (c) =>
      String(c.name ?? "")
        .trim()
        .toLowerCase() === head
  );
  return exact ?? typed[0];
}

/**
 * Build one markdown row (array of 6 cells) from a term + its keywordMetrics.
 * Any null/absent value renders as "—". Nothing is ever fabricated.
 */
export function rowFromMetrics(term, metrics) {
  if (!metrics) {
    return [term, NA, NA, NA, NA, NA];
  }

  const avg = toNumber(metrics.avgMonthlySearches);
  const avgCell = avg === null ? NA : avg.toLocaleString("en-US");

  const months = sortMonthlyVolumes(metrics.monthlySearchVolumes);

  let threeMo = null;
  if (months.length >= 6) {
    const recent = months.slice(-3).map((m) => toNumber(m.monthlySearches));
    const prior = months.slice(-6, -3).map((m) => toNumber(m.monthlySearches));
    if (!recent.includes(null) && !prior.includes(null)) {
      const recentMean = mean(recent);
      const priorMean = mean(prior);
      threeMo = pctChange(recentMean, priorMean);
    }
  }

  let yoy = null;
  if (months.length > 0) {
    const latest = months[months.length - 1];
    const yearAgo = months.find(
      (m) => m.year === latest.year - 1 && m.monthIndex === latest.monthIndex
    );
    if (yearAgo) {
      yoy = pctChange(latest.monthlySearches, yearAgo.monthlySearches);
    }
  }

  const competitionRaw = String(metrics.competition ?? "").toUpperCase();
  const competition = COMPETITION_LEVELS.has(competitionRaw) ? competitionRaw : NA;

  const low = microsToDollars(metrics.lowTopOfPageBidMicros);
  const high = microsToDollars(metrics.highTopOfPageBidMicros);
  const bid = low === null || high === null ? NA : `${low}${EN_DASH}${high}`;

  return [term, avgCell, threeMo ?? NA, yoy ?? NA, competition, bid];
}

/**
 * Render the demand-data.md document.
 * lanes: { national: { geoLabel, rows }, local: { geoLabel, rows } }
 */
export function renderMarkdown({
  title,
  pulled,
  national,
  local,
  apiVersion: version
}) {
  const versionUsed = String(version ?? "").trim() || getApiVersion();
  const header = "| term | avg mo searches | 3-mo | YoY | competition | bid low–high |";
  const sep = "|---|---|---|---|---|---|";
  const table = (rows) =>
    [header, sep, ...rows.map((cells) => `| ${cells.join(" | ")} |`)].join("\n");

  return [
    `# Demand data — ${title} (Keyword Planner, pulled ${pulled})`,
    "",
    `## Lane A — National baseline (geo: ${national.geoLabel})`,
    "Caveat: national volumes describe category shape, not local demand.",
    "",
    table(national.rows),
    "",
    `## Lane B — Local demand (geo: ${local.geoLabel})`,
    "",
    table(local.rows),
    "",
    `Source: Google Ads API ${versionUsed} generateKeywordHistoricalMetrics · language English · network Google Search · pulled ${pulled}`,
    ""
  ].join("\n");
}

/**
 * Map API results back onto the requested terms: exact text first, then
 * closeVariants membership (Google folds variants into one result).
 */
export function matchResultsToTerms(terms, results) {
  const byText = new Map();
  const byVariant = new Map();

  for (const result of results ?? []) {
    if (!result) continue;
    const text = String(result.text ?? "").toLowerCase();
    if (text && !byText.has(text)) byText.set(text, result);
    for (const variant of result.closeVariants ?? []) {
      const key = String(variant ?? "").toLowerCase();
      if (key && !byVariant.has(key)) byVariant.set(key, result);
    }
  }

  const out = new Map();
  for (const term of terms) {
    const key = term.toLowerCase();
    out.set(term, byText.get(key) ?? byVariant.get(key) ?? null);
  }
  return out;
}

// --------------------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------------------

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function microsToDollars(micros) {
  const n = toNumber(micros);
  if (n === null) return null;
  return `$${(n / 1e6).toFixed(2)}`;
}

function sortMonthlyVolumes(volumes) {
  return (volumes ?? [])
    .map((v) => ({
      year: toNumber(v && v.year),
      monthIndex: MONTH_INDEX[String((v && v.month) ?? "").toUpperCase()] ?? null,
      monthlySearches: v ? v.monthlySearches : null
    }))
    .filter((v) => v.year !== null && v.monthIndex !== null)
    .sort((a, b) => a.year - b.year || a.monthIndex - b.monthIndex);
}

function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function splitGeoNames(spec) {
  return String(spec ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Title for the demand-data.md heading: "<domain or terms file stem>".
 * A generic stem like "demand-terms" falls back to the containing directory,
 * which in ~/code/proposals/<domain>/demand-terms.md is the domain.
 */
export function titleFromTermsPath(termsPath) {
  const stem = path.basename(String(termsPath ?? "")).replace(/\.md$/i, "");
  if (!/^demand-?terms$/i.test(stem)) return stem;
  const parent = path.basename(path.dirname(path.resolve(String(termsPath ?? ""))));
  return parent || stem;
}

function fail(message, code) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

// --------------------------------------------------------------------------
// CLI
// --------------------------------------------------------------------------

const USAGE = [
  "Keyword Planner volumes -> demand-data.md",
  "",
  "Usage:",
  "  node scripts/keyword-volumes.mjs --terms <path> --out <path> \\",
  "    [--json <path>] [--env <path>] \\",
  '    [--local-geo "Cobb County, GA;Douglas County, GA"] \\',
  '    [--national-geo "United States"] [--dry-run]',
  "",
  "Env keys (from --env, default .env.local in CWD; process env is a fallback):",
  ...REQUIRED_ENV_KEYS.map((k) => `  ${k} (required)`),
  "  GOOGLE_ADS_CUSTOMER_ID (optional; defaults to GOOGLE_ADS_LOGIN_CUSTOMER_ID)",
  `  ${API_VERSION_ENV_KEY} (optional; defaults to ${DEFAULT_API_VERSION})`,
  ""
].join("\n");

export function parseArgs(argv) {
  const opts = {
    terms: null,
    out: null,
    json: null,
    env: ".env.local",
    localGeo: DEFAULT_LOCAL_GEO,
    nationalGeo: DEFAULT_NATIONAL_GEO,
    dryRun: false
  };
  const flags = {
    "--terms": "terms",
    "--out": "out",
    "--json": "json",
    "--env": "env",
    "--local-geo": "localGeo",
    "--national-geo": "nationalGeo"
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      opts.dryRun = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      opts.help = true;
      continue;
    }
    const key = flags[arg];
    if (!key) throw new Error(`Unknown argument: ${arg}`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }
    opts[key] = value;
    i += 1;
  }

  if (!opts.help) {
    if (!opts.terms) throw new Error("--terms <path> is required");
    if (!opts.out) throw new Error("--out <path> is required");
    if (!opts.json) opts.json = `${opts.out}.json`;
  }
  return opts;
}

function loadEnv(envPath) {
  let fileVars = {};
  let envFileFound = false;
  try {
    fileVars = parseEnvFile(readFileSync(envPath, "utf8"));
    envFileFound = true;
  } catch {
    fileVars = {};
  }

  const resolved = {};
  for (const key of [...REQUIRED_ENV_KEYS, ...OPTIONAL_ENV_KEYS]) {
    const value = fileVars[key] || process.env[key] || "";
    if (value) resolved[key] = value;
  }
  const missing = REQUIRED_ENV_KEYS.filter((key) => !resolved[key]);
  return { resolved, missing, envFileFound };
}

export function buildMetricsBody(
  keywords,
  geoResourceNames,
  yearMonthRange = yearMonthRangeFor()
) {
  return {
    keywords,
    language: LANGUAGE_ENGLISH,
    geoTargetConstants: geoResourceNames,
    keywordPlanNetwork: "GOOGLE_SEARCH",
    historicalMetricsOptions: {
      includeAverageCpc: true,
      yearMonthRange
    }
  };
}

function printDryRun(opts, terms, envState, yearMonthRange) {
  const lines = [
    "Dry run — no network calls will be made.",
    "",
    `API version: ${getApiVersion()} (${API_VERSION_ENV_KEY}${
      envState.resolved[API_VERSION_ENV_KEY]
        ? ""
        : ` unset; default ${DEFAULT_API_VERSION}`
    })`,
    `Historical range: ${formatYearMonthRange(yearMonthRange)} (${HISTORICAL_MONTHS} months, so YoY is computable)`,
    `Terms file: ${opts.terms} (${terms.length} terms)`,
    `Env file:   ${opts.env}${envState.envFileFound ? "" : " (not found; process env only)"}`,
    `Env keys present (values NEVER shown): ${REQUIRED_ENV_KEYS.join(", ")}`,
    `Output:     ${opts.out}`,
    `Raw JSON:   ${opts.json}`,
    ""
  ];

  const lanes = [
    { label: "Lane A — National baseline", names: splitGeoNames(opts.nationalGeo) },
    { label: "Lane B — Local demand", names: splitGeoNames(opts.localGeo) }
  ];

  for (const lane of lanes) {
    lines.push(`${lane.label}`);
    lines.push(`  geo names: ${lane.names.join(" + ")}`);
    lines.push(
      `  POST ${adsBase()}/geoTargetConstants:suggest`,
      `  ${JSON.stringify({
        locale: "en",
        countryCode: "US",
        locationNames: { names: lane.names }
      })}`
    );
    const chunks = chunk(terms, KEYWORD_CHUNK_SIZE);
    lines.push(
      `  POST ${adsBase()}/customers/{customerId}:generateKeywordHistoricalMetrics` +
        `  (${chunks.length} request${chunks.length === 1 ? "" : "s"}, chunk size ${KEYWORD_CHUNK_SIZE})`,
      `  yearMonthRange: ${formatYearMonthRange(yearMonthRange)}`
    );
    chunks.forEach((keywords, i) => {
      const body = buildMetricsBody(
        keywords,
        lane.names.map((n) => `geoTargetConstants/<resolved: ${n}>`),
        yearMonthRange
      );
      lines.push(`  body[${i + 1}]:`);
      lines.push(
        JSON.stringify(body, null, 2)
          .split("\n")
          .map((l) => `    ${l}`)
          .join("\n")
      );
    });
    lines.push("");
  }

  process.stdout.write(lines.join("\n"));
}

// --------------------------------------------------------------------------
// Live API path
// --------------------------------------------------------------------------

async function postJson(url, body, headers) {
  const response = await globalThis.fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: response.ok, status: response.status, json, text };
}

export function describeApiError(status, json, text) {
  const error = json && json.error ? json.error : null;
  const message = error && error.message ? error.message : text || `HTTP ${status}`;
  let code = null;
  const details = (error && error.details) || [];
  for (const detail of details) {
    const errors = detail && detail.errors ? detail.errors : [];
    if (errors.length && errors[0].errorCode) {
      code = JSON.stringify(errors[0].errorCode);
      break;
    }
  }
  const lines = [`Google Ads API error (HTTP ${status}): ${message}`];
  if (code) lines.push(`errorCode: ${code}`);
  const haystack = `${message} ${code ?? ""}`;
  if (/manager/i.test(haystack)) lines.push(`Hint: ${MANAGER_HINT}`);
  return lines.join("\n");
}

async function getAccessToken(env) {
  const response = await globalThis.fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new globalThis.URLSearchParams({
      client_id: env.GOOGLE_ADS_CLIENT_ID,
      client_secret: env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: "refresh_token"
    }).toString()
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  if (!response.ok || !json || !json.access_token) {
    const detail = json && json.error_description ? json.error_description : text;
    fail(`OAuth token exchange failed (HTTP ${response.status}): ${detail}`, 2);
  }
  return json.access_token;
}

function adsHeaders(accessToken, env) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": env.GOOGLE_ADS_DEVELOPER_TOKEN,
    "login-customer-id": env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
  };
}

async function resolveGeoTargets(names, accessToken, env) {
  const res = await postJson(
    `${adsBase()}/geoTargetConstants:suggest`,
    { locale: "en", countryCode: "US", locationNames: { names } },
    adsHeaders(accessToken, env)
  );
  if (!res.ok) fail(describeApiError(res.status, res.json, res.text), 2);
  const suggestions = (res.json && res.json.geoTargetConstantSuggestions) || [];
  return names.map((name) => {
    try {
      return pickGeoConstant(name, suggestions);
    } catch (err) {
      fail(err.message, 2);
      return null;
    }
  });
}

async function fetchLaneMetrics(terms, geoNames, accessToken, env, yearMonthRange) {
  const customerId = env.GOOGLE_ADS_CUSTOMER_ID || env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  const constants = await resolveGeoTargets(geoNames, accessToken, env);
  const resourceNames = constants.map((c) => c.resourceName);

  const results = [];
  for (const keywords of chunk(terms, KEYWORD_CHUNK_SIZE)) {
    const res = await postJson(
      `${adsBase()}/customers/${customerId}:generateKeywordHistoricalMetrics`,
      buildMetricsBody(keywords, resourceNames, yearMonthRange),
      adsHeaders(accessToken, env)
    );
    if (!res.ok) fail(describeApiError(res.status, res.json, res.text), 2);
    for (const r of (res.json && res.json.results) || []) results.push(r);
  }

  return {
    geoLabel: geoNames.join(" + "),
    geoTargets: constants.map((c) => ({
      name: c.name,
      canonicalName: c.canonicalName,
      targetType: c.targetType,
      resourceName: c.resourceName
    })),
    results
  };
}

function laneRows(terms, results) {
  const matched = matchResultsToTerms(terms, results);
  return terms.map((term) => {
    const result = matched.get(term);
    return rowFromMetrics(term, result ? result.keywordMetrics : null);
  });
}

// --------------------------------------------------------------------------
// main
// --------------------------------------------------------------------------

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err.message}\n\n${USAGE}`);
    process.exit(1);
  }
  if (opts.help) {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  let terms;
  try {
    terms = parseTerms(readFileSync(opts.terms, "utf8"));
  } catch (err) {
    fail(`Could not read terms from ${opts.terms}: ${err.message}`, 1);
  }

  const envState = loadEnv(opts.env);
  setApiVersion(resolveApiVersion(envState.resolved));
  const yearMonthRange = yearMonthRangeFor();

  if (envState.missing.length > 0) {
    fail(
      [
        `Missing required env key${envState.missing.length === 1 ? "" : "s"}: ${envState.missing.join(", ")}`,
        `Looked in ${opts.env}${envState.envFileFound ? "" : " (file not found)"} and the process environment.`,
        "Values are never read back or printed by this script — key names only."
      ].join("\n"),
      1
    );
  }

  if (opts.dryRun) {
    printDryRun(opts, terms, envState, yearMonthRange);
    process.exit(0);
  }

  const env = envState.resolved;
  const accessToken = await getAccessToken(env);

  const national = await fetchLaneMetrics(
    terms,
    splitGeoNames(opts.nationalGeo),
    accessToken,
    env,
    yearMonthRange
  );
  const local = await fetchLaneMetrics(
    terms,
    splitGeoNames(opts.localGeo),
    accessToken,
    env,
    yearMonthRange
  );

  const pulled = today();
  const title = titleFromTermsPath(opts.terms);

  const markdown = renderMarkdown({
    title,
    pulled,
    apiVersion: getApiVersion(),
    national: { geoLabel: national.geoLabel, rows: laneRows(terms, national.results) },
    local: { geoLabel: local.geoLabel, rows: laneRows(terms, local.results) }
  });
  writeFileSync(opts.out, markdown, "utf8");

  writeFileSync(
    opts.json,
    `${JSON.stringify(
      {
        pulled,
        apiVersion: getApiVersion(),
        yearMonthRange,
        termsFile: opts.terms,
        terms,
        lanes: {
          national: {
            geoNames: splitGeoNames(opts.nationalGeo),
            geoTargets: national.geoTargets,
            results: national.results
          },
          local: {
            geoNames: splitGeoNames(opts.localGeo),
            geoTargets: local.geoTargets,
            results: local.results
          }
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );

  process.stdout.write(`Wrote ${opts.out} and ${opts.json} (${terms.length} terms).\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exit(2);
  });
}
