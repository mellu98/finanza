/**
 * Test plan for `localForageDebtsRepository`.
 *
 * The repository persists a `Debt[]` (flat list, no active pointer)
 * to a localforage instance. The contract mirrors the transactions
 * and savings-goals repos: `getAll` / `saveAll` / `add` / `remove`.
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
import { DebtMother } from "./Debt.mother";

const resetStore = async () => {
  await vi.mocked(localforage).__resetMock();
  vi.mocked(localforage.createInstance).mockClear();
};

describe("localForageDebtsRepository", () => {
  beforeEach(async () => {
    await resetStore();
  });

  afterEach(async () => {
    await resetStore();
  });

  it("saveAll → getAll round-trips a list", async () => {
    const { localForageDebtsRepository } = await import(
      "./localForageDebtsRepository"
    );
    const repo = new localForageDebtsRepository();
    const list = [DebtMother.creditCard(), DebtMother.personalLoan()];
    await repo.saveAll(list);
    const back = await repo.getAll();
    expect(back).toHaveLength(2);
    expect(back[0]?.id).toBe("debt-credit-card");
    expect(back[1]?.id).toBe("debt-personal-loan");
  });

  it("add(debt) appends to the list", async () => {
    const { localForageDebtsRepository } = await import(
      "./localForageDebtsRepository"
    );
    const repo = new localForageDebtsRepository();
    await repo.add(DebtMother.creditCard());
    await repo.add(DebtMother.personalLoan());
    const back = await repo.getAll();
    expect(back).toHaveLength(2);
  });

  it("remove(id) drops the matching debt", async () => {
    const { localForageDebtsRepository } = await import(
      "./localForageDebtsRepository"
    );
    const repo = new localForageDebtsRepository();
    await repo.add(DebtMother.creditCard());
    await repo.add(DebtMother.personalLoan());
    const removed = await repo.remove("debt-credit-card");
    expect(removed).toBe(true);
    const back = await repo.getAll();
    expect(back).toHaveLength(1);
    expect(back[0]?.id).toBe("debt-personal-loan");
  });
});
