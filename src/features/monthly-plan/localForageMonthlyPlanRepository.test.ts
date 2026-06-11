/**
 * Test plan for `localForageMonthlyPlanRepository`.
 *
 * The repository persists `MonthlyPlan` aggregates to a localforage
 * instance and tracks which one is the "active" plan (the one the UI
 * should display). The contract:
 *
 *   - `save(plan)` persists a plan by id; the first plan saved becomes
 *     the active plan.
 *   - `getActive()` returns the currently active plan, or `undefined`
 *     if none.
 *   - `setActive(id)` switches the active plan to the one with the
 *     given id, overwriting any previous active plan.
 *
 * The localforage module is mocked with a stateful in-memory store so
 * the tests run without IndexedDB and stay deterministic.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("localforage", () => {
  const stores = new Map<string, Map<string, unknown>>();

  const makeInstance = (storeName: string) => {
    if (!stores.has(storeName)) {
      stores.set(storeName, new Map());
    }
    const store = stores.get(storeName);
    if (!store) throw new Error("store missing");
    return {
      getItem: vi.fn(async (key: string) => {
        await Promise.resolve();
        return store.get(key) ?? null;
      }),
      setItem: vi.fn(async (key: string, value: unknown) => {
        await Promise.resolve();
        store.set(key, value);
      }),
      removeItem: vi.fn(async (key: string) => {
        await Promise.resolve();
        store.delete(key);
      }),
      keys: vi.fn(async () => {
        await Promise.resolve();
        return Array.from(store.keys());
      }),
    };
  };

  return {
    default: {
      createInstance: vi.fn((opts: { storeName: string }) =>
        makeInstance(opts.storeName),
      ),
      __resetMock: () => stores.clear(),
    },
  };
});

import localforage from "localforage";

import { MonthlyPlanMother } from "./MonthlyPlanMother";

const resetStore = async () => {
  await vi.mocked(localforage).__resetMock();
  vi.mocked(localforage.createInstance).mockClear();
};

describe("localForageMonthlyPlanRepository", () => {
  beforeEach(async () => {
    await resetStore();
  });

  afterEach(async () => {
    await resetStore();
  });

  it("save → getActive round-trips a plan", async () => {
    const { localForageMonthlyPlanRepository } = await import(
      "./localForageMonthlyPlanRepository"
    );
    const repo = new localForageMonthlyPlanRepository();
    const plan = MonthlyPlanMother.testPlan({ id: "p1" });
    await repo.save(plan);
    const active = await repo.getActive();
    expect(active).toBeDefined();
    expect(active?.id).toBe("p1");
    expect(active?.periodStart).toBe(plan.periodStart);
  });

  it("setActive(id) overwrites the previously active plan", async () => {
    const { localForageMonthlyPlanRepository } = await import(
      "./localForageMonthlyPlanRepository"
    );
    const repo = new localForageMonthlyPlanRepository();
    const p1 = MonthlyPlanMother.testPlan({ id: "p1" });
    const p2 = MonthlyPlanMother.testPlan({ id: "p2" });
    await repo.save(p1);
    await repo.save(p2);
    await repo.setActive("p1");
    expect((await repo.getActive())?.id).toBe("p1");
    await repo.setActive("p2");
    expect((await repo.getActive())?.id).toBe("p2");
  });
});
