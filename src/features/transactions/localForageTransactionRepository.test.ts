/**
 * Test plan for `localForageTransactionRepository`.
 *
 * The repository persists `Transaction[]` (a flat list, no active
 * pointer) to a localforage instance. The contract:
 *
 *   - `saveAll(transactions)` replaces the entire list.
 *   - `getAll()` returns the persisted list, or `[]` when empty.
 *   - `add(transaction)` appends to the list (or updates by id).
 *   - `remove(id)` removes the transaction with the given id.
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
import { TransactionMother } from "./Transaction.mother";

const resetStore = async () => {
  await vi.mocked(localforage).__resetMock();
  vi.mocked(localforage.createInstance).mockClear();
};

describe("localForageTransactionRepository", () => {
  beforeEach(async () => {
    await resetStore();
  });

  afterEach(async () => {
    await resetStore();
  });

  it("saveAll → getAll round-trips a list", async () => {
    const { localForageTransactionRepository } = await import(
      "./localForageTransactionRepository"
    );
    const repo = new localForageTransactionRepository();
    const list = [
      TransactionMother.groceriesExpense42(),
      TransactionMother.salary1500(),
    ];
    await repo.saveAll(list);
    const back = await repo.getAll();
    expect(back).toHaveLength(2);
    expect(back[0]?.id).toBe("tx-groceries-42");
    expect(back[1]?.id).toBe("tx-salary-1500");
  });

  it("add(transaction) appends to the list", async () => {
    const { localForageTransactionRepository } = await import(
      "./localForageTransactionRepository"
    );
    const repo = new localForageTransactionRepository();
    await repo.add(TransactionMother.groceriesExpense42());
    await repo.add(TransactionMother.salary1500());
    const back = await repo.getAll();
    expect(back).toHaveLength(2);
  });

  it("remove(id) drops the matching transaction", async () => {
    const { localForageTransactionRepository } = await import(
      "./localForageTransactionRepository"
    );
    const repo = new localForageTransactionRepository();
    await repo.add(TransactionMother.groceriesExpense42());
    await repo.add(TransactionMother.salary1500());
    const removed = await repo.remove("tx-groceries-42");
    expect(removed).toBe(true);
    const back = await repo.getAll();
    expect(back).toHaveLength(1);
    expect(back[0]?.id).toBe("tx-salary-1500");
  });
});
