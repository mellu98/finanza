/**
 * One-shot data migration: copy the user's legacy `guitos` IndexedDB data
 * (budgets, options, calcHist) into the new `daily-coach` IndexedDB so the
 * upgrade from Guitos to Daily Financial Coach is non-destructive.
 *
 * Contract:
 * - Idempotent: a `dfc:migration-v0` flag is written in the `_meta` store
 *   on first success; subsequent calls become no-ops that return
 *   `{ migrated: false, copiedKeys: [] }`.
 * - Non-destructive: the source `guitos.*` stores are NEVER removed or
 *   mutated. We copy values into the target; we do not delete originals.
 * - Empty-safe: when the source DB is missing or every store is empty,
 *   the migration still succeeds and writes the flag.
 */
import localforage from "localforage";

const SOURCE_DB = "guitos";
const TARGET_DB = "daily-coach";
const FLAG_KEY = "dfc:migration-v0";
const META_STORE = "_meta";
const MIGRATION_STORES = ["budgets", "options", "calcHist"] as const;

export type MigrationStore = (typeof MIGRATION_STORES)[number];

export interface MigrationResult {
  migrated: boolean;
  copiedKeys: string[];
}

interface MigrationFlag {
  at: string;
  version: 1;
}

export async function migrateFromGuitos(): Promise<MigrationResult> {
  const metaInstance = localforage.createInstance({
    name: TARGET_DB,
    storeName: META_STORE,
  });

  const existingFlag = await metaInstance.getItem<MigrationFlag>(FLAG_KEY);
  if (existingFlag) {
    return { migrated: false, copiedKeys: [] };
  }

  const copiedKeys: string[] = [];

  for (const storeName of MIGRATION_STORES) {
    const source = localforage.createInstance({
      name: SOURCE_DB,
      storeName,
    });
    const target = localforage.createInstance({
      name: TARGET_DB,
      storeName,
    });

    const keys = await source.keys();
    for (const key of keys) {
      const value = await source.getItem<unknown>(key);
      if (value === undefined) continue;
      await target.setItem(key, value);
      copiedKeys.push(`${storeName}/${key}`);
    }
  }

  const flag: MigrationFlag = { at: new Date().toISOString(), version: 1 };
  await metaInstance.setItem(FLAG_KEY, flag);

  return { migrated: true, copiedKeys };
}
