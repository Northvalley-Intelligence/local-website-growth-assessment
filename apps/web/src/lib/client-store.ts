import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  clientInputSchema,
  type ClientInput,
  type ClientPatch,
  type ClientRecord,
  type ListingEntry,
  type ListingStatus
} from "./client-record";

type D1DatabaseBinding = {
  exec(sql: string): Promise<unknown>;
  prepare(sql: string): {
    run(): Promise<unknown>;
    bind(...values: unknown[]): {
      run(): Promise<unknown>;
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results?: T[] }>;
    };
    first<T = unknown>(): Promise<T | null>;
    all<T = unknown>(): Promise<{ results?: T[] }>;
  };
};

type ClientCloudflareEnv = { ASSESSMENT_DB?: D1DatabaseBinding };
type StoredClientRow = { record_json: string };

// globalThis-backed so Next dev's separate route/page bundles share one map.
const globalForClients = globalThis as unknown as {
  __nvClients?: Map<string, ClientRecord>;
};
const clients = (globalForClients.__nvClients ??= new Map<string, ClientRecord>());
let d1SchemaReady: Promise<void> | null = null;

export async function createClient(
  input: ClientInput,
  now = new Date()
): Promise<ClientRecord> {
  const parsed = clientInputSchema.parse(input);
  const timestamp = now.toISOString();
  const record: ClientRecord = {
    ...parsed,
    id: `client-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    listings: {}
  };
  await storeClient(record);
  return record;
}

export async function getClient(id: string): Promise<ClientRecord | null> {
  const d1 = getClientD1();
  if (d1) {
    await ensureD1Schema(d1);
    const row = await d1
      .prepare("SELECT record_json FROM clients WHERE id = ?")
      .bind(id)
      .first<StoredClientRow>();
    return row ? (JSON.parse(row.record_json) as ClientRecord) : null;
  }
  return clients.get(id) ?? null;
}

export async function listClients(): Promise<ClientRecord[]> {
  const d1 = getClientD1();
  if (d1) {
    await ensureD1Schema(d1);
    const rows = await d1
      .prepare("SELECT record_json FROM clients ORDER BY created_at DESC LIMIT ?")
      .bind(500)
      .all<StoredClientRow>();
    return (rows.results ?? []).map(
      (row) => JSON.parse(row.record_json) as ClientRecord
    );
  }
  return [...clients.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateClient(
  id: string,
  patch: ClientPatch,
  now = new Date()
): Promise<ClientRecord | null> {
  const current = await getClient(id);
  if (!current) return null;
  const { address, hours, ...rest } = patch;
  const next: ClientRecord = {
    ...current,
    ...stripUndefined(rest),
    address: { ...current.address, ...stripUndefined(address ?? {}) },
    hours: { ...current.hours, ...stripUndefined(hours ?? {}) },
    updatedAt: now.toISOString()
  };
  await storeClient(next);
  return next;
}

export async function setListingStatus(
  id: string,
  platform: string,
  status: ListingStatus,
  extra: Partial<Omit<ListingEntry, "status" | "updatedAt">> = {},
  now = new Date()
): Promise<ClientRecord | null> {
  const current = await getClient(id);
  if (!current) return null;
  const timestamp = now.toISOString();
  const previous = current.listings[platform];
  const entry: ListingEntry = {
    missingAtSubmit: [],
    ...previous,
    ...stripUndefined(extra),
    status,
    updatedAt: timestamp
  };
  if (status === "submitted" && !entry.submittedAt) entry.submittedAt = timestamp;
  const next: ClientRecord = {
    ...current,
    listings: { ...current.listings, [platform]: entry },
    updatedAt: timestamp
  };
  await storeClient(next);
  return next;
}

export async function setPrefillMarker(
  id: string,
  fieldsFilled: string[],
  now = new Date()
): Promise<ClientRecord | null> {
  const current = await getClient(id);
  if (!current) return null;
  const next: ClientRecord = {
    ...current,
    prefill: { source: "google_places", at: now.toISOString(), fieldsFilled },
    updatedAt: now.toISOString()
  };
  await storeClient(next);
  return next;
}

export async function clearClientsForTest(): Promise<void> {
  if (process.env.NODE_ENV !== "test") return;
  clients.clear();
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

async function storeClient(record: ClientRecord): Promise<void> {
  const d1 = getClientD1();
  if (d1) {
    await ensureD1Schema(d1);
    await d1
      .prepare(
        "INSERT OR REPLACE INTO clients (id, created_at, updated_at, record_json) VALUES (?, ?, ?, ?)"
      )
      .bind(record.id, record.createdAt, record.updatedAt, JSON.stringify(record))
      .run();
    return;
  }
  clients.set(record.id, record);
}

function getClientD1(): D1DatabaseBinding | null {
  if (process.env.NODE_ENV === "test") return null;
  try {
    const env = getCloudflareContext().env as ClientCloudflareEnv;
    return env.ASSESSMENT_DB ?? null;
  } catch {
    return null;
  }
}

async function ensureD1Schema(d1: D1DatabaseBinding): Promise<void> {
  d1SchemaReady ??= (async () => {
    await d1
      .prepare(
        "CREATE TABLE IF NOT EXISTS clients (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, record_json TEXT NOT NULL)"
      )
      .run();
    await d1
      .prepare(
        "CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients (created_at DESC)"
      )
      .run();
  })();
  await d1SchemaReady;
}
