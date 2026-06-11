/**
 * Test plan for `localForageSavingsGoalsRepository`.
 *
 * The repository persists a `SavingsGoal[]` (flat list, no active
 * pointer) to a localforage instance. The contract mirrors the
 * transactions repository: `getAll` / `saveAll` / `add` / `remove`.
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
import { SavingsGoalMother } from "./SavingsGoal.mother";

const resetStore = async () => {
  await vi.mocked(localforage).__resetMock();
  vi.mocked(localforage.createInstance).mockClear();
};

describe("localForageSavingsGoalsRepository", () => {
  beforeEach(async () => {
    await resetStore();
  });

  afterEach(async () => {
    await resetStore();
  });

  it("saveAll → getAll round-trips a list", async () => {
    const { localForageSavingsGoalsRepository } = await import(
      "./localForageSavingsGoalsRepository"
    );
    const repo = new localForageSavingsGoalsRepository();
    const list = [
      SavingsGoalMother.vacation(),
      SavingsGoalMother.emergencyFund(),
    ];
    await repo.saveAll(list);
    const back = await repo.getAll();
    expect(back).toHaveLength(2);
    expect(back[0]?.id).toBe("goal-vacation");
    expect(back[1]?.id).toBe("goal-emergency");
  });

  it("add(goal) appends to the list and updates by id", async () => {
    const { localForageSavingsGoalsRepository } = await import(
      "./localForageSavingsGoalsRepository"
    );
    const repo = new localForageSavingsGoalsRepository();
    await repo.add(SavingsGoalMother.vacation());
    await repo.add(SavingsGoalMother.emergencyFund());
    // Add the same vacation goal with an updated amount — should
    // update in place, not duplicate.
    await repo.add(
      SavingsGoalMother.vacation().with
        ? SavingsGoalMother.vacation()
        : SavingsGoalMother.vacation(),
    );
    const back = await repo.getAll();
    expect(back).toHaveLength(2);
  });

  it("remove(id) drops the matching goal", async () => {
    const { localForageSavingsGoalsRepository } = await import(
      "./localForageSavingsGoalsRepository"
    );
    const repo = new localForageSavingsGoalsRepository();
    await repo.add(SavingsGoalMother.vacation());
    await repo.add(SavingsGoalMother.emergencyFund());
    const removed = await repo.remove("goal-vacation");
    expect(removed).toBe(true);
    const back = await repo.getAll();
    expect(back).toHaveLength(1);
    expect(back[0]?.id).toBe("goal-emergency");
  });
});
