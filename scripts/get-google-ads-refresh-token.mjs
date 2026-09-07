#!/usr/bin/env node
// get-google-ads-refresh-token.mjs
// ---------------------------------------------------------------------------
// Self-contained Google Ads API refresh-token helper (Node built-ins only).
// Runs the OAuth2 "installed app" (loopback) flow and prints a refresh token.
//
// Node built-ins only: http, https, crypto, child_process, fs, url. No npm deps.
//
// THREE STEPS for Ferosh:
//   1. Download the OAuth client JSON: Cloud Console -> Google Auth Platform ->
//      Clients -> the "Demand data" DESKTOP client -> download icon. It saves as
//      client_secret_*.json.
//   2. Run this script, passing that file:
//         node scripts/get-google-ads-refresh-token.mjs ~/Downloads/client_secret_XXX.json
//      (or, with GOOGLE_ADS_CLIENT_ID / GOOGLE_ADS_CLIENT_SECRET in .env.local,
//       just: node scripts/get-google-ads-refresh-token.mjs)
//      A browser opens for Google consent. This is YOUR OWN app: if you see an
//      "unverified app / Google hasn't verified this app" screen, click
//      Advanced -> continue (you are the owner). Approve the adwords scope.
//   3. Copy the printed refresh token into .env.local:
//         GOOGLE_ADS_REFRESH_TOKEN=<value>
//      and set GOOGLE_ADS_LOGIN_CUSTOMER_ID to your manager (MCC) account's
//      10-digit ID (digits only, no dashes).
//
// SECURITY: the client secret is only held in memory and used once, in the
// HTTPS POST body to Google's token endpoint. It is NEVER printed to stdout/stderr
// and NEVER written to disk. The only secret this script emits is the refresh
// token itself (to stdout), which is the intended output.
// ---------------------------------------------------------------------------

import http from 'node:http';
import https from 'node:https';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { URL, URLSearchParams } from 'node:url';

const PORT = 8765;
const REDIRECT_URI = `http://localhost:${PORT}`;
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/adwords';

function usageAndExit() {
  process.stderr.write(
    [
      'Google Ads API refresh-token helper',
      '',
      'Usage:',
      '  node scripts/get-google-ads-refresh-token.mjs <path-to-client_secret.json>',
      '  node scripts/get-google-ads-refresh-token.mjs        (reads .env.local in CWD)',
      '',
      'Credentials (in priority order):',
      '  1. argv[2] = path to the OAuth client JSON downloaded from Cloud Console',
      '     (Google Auth Platform -> Clients -> the "Demand data" desktop client ->',
      '      download icon). Reads .installed.client_id / .installed.client_secret.',
      '  2. Otherwise, GOOGLE_ADS_CLIENT_ID and GOOGLE_ADS_CLIENT_SECRET from',
      '     .env.local in the current working directory.',
      '',
      'The script opens a browser for Google consent, captures the code on',
      `  ${REDIRECT_URI}, exchanges it, and prints ONLY the refresh token.`,
      '',
    ].join('\n')
  );
  process.exit(1);
}

// Parse a minimal .env.local for exactly the two client fields we need.
// Never prints any value read from this file.
function readEnvLocalCreds() {
  let text;
  try {
    text = readFileSync('.env.local', 'utf8');
  } catch {
    return null;
  }
  const wanted = { GOOGLE_ADS_CLIENT_ID: null, GOOGLE_ADS_CLIENT_SECRET: null };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!(key in wanted)) continue;
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    wanted[key] = val;
  }
  if (wanted.GOOGLE_ADS_CLIENT_ID && wanted.GOOGLE_ADS_CLIENT_SECRET) {
    return {
      clientId: wanted.GOOGLE_ADS_CLIENT_ID,
      clientSecret: wanted.GOOGLE_ADS_CLIENT_SECRET,
    };
  }
  return null;
}

function readClientJson(path) {
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    process.stderr.write(`Could not read/parse client JSON at ${path}: ${err.message}\n`);
    process.exit(1);
  }
  const inst = parsed.installed || parsed.web;
  if (!inst || !inst.client_id || !inst.client_secret) {
    process.stderr.write(
      'Client JSON is missing .installed.client_id / .installed.client_secret.\n'
    );
    process.exit(1);
  }
  return { clientId: inst.client_id, clientSecret: inst.client_secret };
}

function resolveCreds() {
  const arg = process.argv[2];
  if (arg === '--help' || arg === '-h') usageAndExit();
  if (arg) return readClientJson(arg);
  const fromEnv = readEnvLocalCreds();
  if (fromEnv) return fromEnv;
  usageAndExit();
}

// Wait for the OAuth redirect, resolve with the authorization code.
function waitForCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, REDIRECT_URI);
      const code = reqUrl.searchParams.get('code');
      const error = reqUrl.searchParams.get('error');
      if (!code && !error) {
        // Ignore stray requests (e.g. favicon) without tearing down.
        res.writeHead(204);
        res.end();
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(
        '<!doctype html><html><head><meta charset="utf-8"><title>Refresh token captured</title></head>' +
          '<body style="font-family:system-ui,sans-serif;padding:2rem">' +
          '<h2>You can close this tab — refresh token captured.</h2>' +
          '<p>Return to the terminal.</p></body></html>'
      );
      server.close(() => {
        if (error) reject(new Error(`OAuth error: ${error}`));
        else resolve(code);
      });
    });
    server.on('error', reject);
    // Bind to loopback only.
    server.listen(PORT, '127.0.0.1');
  });
}

function exchangeCode(code, clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString();

    const url = new URL(TOKEN_ENDPOINT);
    const req = https.request(
      {
        method: 'POST',
        hostname: url.hostname,
        path: url.pathname,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function openInBrowser(url) {
  // Best-effort; failure is non-fatal (URL is also printed).
  try {
    const child = spawn('open', [url], { stdio: 'ignore', detached: true });
    child.on('error', () => {});
    child.unref();
  } catch {
    /* ignore */
  }
}

async function main() {
  const { clientId, clientSecret } = resolveCreds();

  const authUrl =
    AUTH_ENDPOINT +
    '?' +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPE,
      access_type: 'offline',
      prompt: 'consent',
    }).toString();

  process.stderr.write(
    [
      '',
      'Opening your browser for Google consent...',
      'If it does not open, paste this URL into your browser:',
      '',
      authUrl,
      '',
      'NOTE: This is your own app. If you see an "unverified app / Google',
      'hasn\'t verified this app" screen, click Advanced -> continue',
      '(you are the owner). Approve the AdWords scope.',
      '',
    ].join('\n')
  );

  openInBrowser(authUrl);

  const code = await waitForCode();
  const { status, body } = await exchangeCode(code, clientId, clientSecret);

  let json;
  try {
    json = JSON.parse(body);
  } catch {
    process.stderr.write(`Token endpoint returned non-JSON (HTTP ${status}):\n${body}\n`);
    process.exit(1);
  }

  if (!json.refresh_token) {
    process.stderr.write(
      [
        `No refresh_token in the token response (HTTP ${status}).`,
        'Response body:',
        body,
        '',
        'Hint: refresh_token is only returned when prompt=consent AND the app',
        'has offline access. If you have authorized this app before, revoke it at',
        'https://myaccount.google.com/permissions and run this script again.',
        '',
      ].join('\n')
    );
    process.exit(1);
  }

  // The ONLY secret written to stdout: the refresh token (intended output).
  process.stdout.write(
    [
      '',
      '=== Google Ads API refresh token ===',
      json.refresh_token,
      '====================================',
      '',
      'Add to .env.local:',
      `  GOOGLE_ADS_REFRESH_TOKEN=${json.refresh_token}`,
      '  — and set GOOGLE_ADS_LOGIN_CUSTOMER_ID to your manager (MCC) account\'s',
      '    10-digit ID (digits only, no dashes).',
      '',
    ].join('\n')
  );
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
