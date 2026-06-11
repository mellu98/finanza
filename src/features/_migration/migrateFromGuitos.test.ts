/**
 * Test plan for `migrateFromGuitos()` — one-shot data migration from the
 * legacy `guitos` IndexedDB to the new `daily-coach` IndexedDB.
 *
 * The migration is invoked once on application startup. After a successful
 * run the `dfc:migration-v0` flag is persisted in the new DB, the source
 * data is copied (NEVER deleted) to the new DB, and subsequent invocations
 * become no-ops.
 *
 * We mock `localforage` to simulate two IndexedDB databases (`guitos` and
 * `daily-coach`) with three object stores each (`budgets`, `options`,
 * `calcHist`) plus a separate `_meta` store for the migration flag.
 */
import localforage from "localforage";
import { beforeEach, describe, expect, it, vi } from "vitest";

// One shared in-memory map per (name, storeName) pair. The mock factory
// returns a new object on every `createInstance` call, but the underlying
// Map is shared — this is the closest 1:1 analogue to how real localforage
// opens the same IndexedDB store from multiple LocalForage objects.
const stores = vi.hoisted(() => new Map<string, Map<string, unknown>>());

vi.mock("localforage", () => ({
  default: {
    createInstance: ({
      name,
      storeName,
    }: {
      name: string;
      storeName: string;
    }) => {
      const key = `${name}/${storeName}`;
      const map = stores.get(key) ?? new Map<string, unknown>();
      stores.set(key, map);
      return {
        getItem: vi.fn((k: string) => Promise.resolve(map.get(k))),
        setItem: vi.fn((k: string, v: unknown) => {
          map.set(k, v);
          return Promise.resolve();
        }),
        keys: vi.fn(() => Promise.resolve(Array.from(map.keys()))),
        removeItem: vi.fn((k: string) => {
          map.delete(k);
          return Promise.resolve();
        }),
      };
    },
  },
}));

const SOURCE_DB = "guitos";
const TARGET_DB = "daily-coach";
const FLAG_KEY = "dfc:migration-v0";
const MIGRATION_STORES = ["budgets", "options", "calcHist"] as const;
const META_STORE = "_meta";

async function seedSource(
  store: (typeof MIGRATION_STORES)[number],
  entries: Record<string, unknown>,
): Promise<void> {
  const instance = localforage.createInstance({
    name: SOURCE_DB,
    storeName: store,
  });
  for (const [key, value] of Object.entries(entries)) {
    await instance.setItem(key, value);
  }
}

async function readTarget(
  store: (typeof MIGRATION_STORES)[number] | typeof META_STORE,
  key: string,
): Promise<unknown> {
  const instance = localforage.createInstance({
    name: TARGET_DB,
    storeName: store,
  });
  return await instance.getItem(key);
}

describe("migrateFromGuitos", () => {
  beforeEach(() => {
    stores.clear();
  });

  it("copies all source entries into the matching target stores and sets the migration flag on first run", async () => {
    await seedSource("budgets", {
      "budget-1": { id: "budget-1", name: "2024-01" },
      "budget-2": { id: "budget-2", name: "2024-02" },
    });
    await seedSource("options", {
      "user-options": { currencyCode: "EUR", locale: "en-IE" },
    });
    await seedSource("calcHist", {
      "calc-1": { id: "calc-1", total: 100 },
    });

    const { migrateFromGuitos } = await import("./migrateFromGuitos");

    const result = await migrateFromGuitos();

    expect(result.migrated).toBe(true);
    expect(result.copiedKeys).toEqual(
      expect.arrayContaining([
        "budgets/budget-1",
        "budgets/budget-2",
        "options/user-options",
        "calcHist/calc-1",
      ]),
    );
    expect(result.copiedKeys).toHaveLength(4);

    expect(await readTarget("budgets", "budget-1")).toEqual({
      id: "budget-1",
      name: "2024-01",
    });
    expect(await readTarget("budgets", "budget-2")).toEqual({
      id: "budget-2",
      name: "2024-02",
    });
    expect(await readTarget("options", "user-options")).toEqual({
      currencyCode: "EUR",
      locale: "en-IE",
    });
    expect(await readTarget("calcHist", "calc-1")).toEqual({
      id: "calc-1",
      total: 100,
    });

    const flag = await readTarget(META_STORE, FLAG_KEY);
    expect(flag).toEqual(
      expect.objectContaining({ version: 1, at: expect.any(String) }),
    );
    expect(new Date((flag as { at: string }).at).toString()).not.toBe(
      "Invalid Date",
    );
  });

  it("is idempotent: a second call is a no-op and does not duplicate or overwrite target data", async () => {
    await seedSource("budgets", {
      "budget-1": { id: "budget-1", name: "first" },
    });

    const { migrateFromGuitos } = await import("./migrateFromGuitos");

    const first = await migrateFromGuitos();
    expect(first.migrated).toBe(true);

    // Simulate the user mutating target data after migration; the second
    // call must NOT touch it.
    const targetBudgets = localforage.createInstance({
      name: TARGET_DB,
      storeName: "budgets",
    });
    await targetBudgets.setItem("budget-1", { id: "budget-1", name: "edited" });
    await targetBudgets.setItem("budget-extra", { id: "new", name: "added" });

    const second = await migrateFromGuitos();

    expect(second.migrated).toBe(false);
    expect(second.copiedKeys).toEqual([]);

    // The user's local edits survive — migration never re-runs.
    expect(await readTarget("budgets", "budget-1")).toEqual({
      id: "budget-1",
      name: "edited",
    });
    expect(await readTarget("budgets", "budget-extra")).toEqual({
      id: "new",
      name: "added",
    });
  });

  it("never deletes source data: the legacy `guitos` stores are preserved after migration", async () => {
    await seedSource("budgets", { "budget-1": { id: "budget-1" } });
    await seedSource("options", { "user-options": { currencyCode: "EUR" } });

    const { migrateFromGuitos } = await import("./migrateFromGuitos");

    await migrateFromGuitos();

    const sourceBudgets = localforage.createInstance({
      name: SOURCE_DB,
      storeName: "budgets",
    });
    const sourceOptions = localforage.createInstance({
      name: SOURCE_DB,
      storeName: "options",
    });

    expect(await sourceBudgets.getItem("budget-1")).toEqual({ id: "budget-1" });
    expect(await sourceOptions.getItem("user-options")).toEqual({
      currencyCode: "EUR",
    });
  });

  it("succeeds without errors and still sets the flag when the source `guitos` DB is missing or empty", async () => {
    // No seeding — every store is empty / nonexistent.
    const { migrateFromGuitos } = await import("./migrateFromGuitos");

    const result = await migrateFromGuitos();

    expect(result.migrated).toBe(true);
    expect(result.copiedKeys).toEqual([]);

    const flag = await readTarget(META_STORE, FLAG_KEY);
    expect(flag).toEqual(
      expect.objectContaining({ version: 1, at: expect.any(String) }),
    );
  });
});
