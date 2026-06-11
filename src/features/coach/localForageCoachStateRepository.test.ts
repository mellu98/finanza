/**
 * Test plan for `localForageCoachStateRepository`.
 *
 * The repository persists the user's coach chat history. v1 keeps
 * only the last 20 turns (the spec's "persistent chat history beyond
 * the last 20 turns is out of scope"). The cap is enforced in the
 * repository's `save` method: if the caller persists 25 turns, only
 * the latest 20 are written.
 *
 * The localforage module is mocked with a stateful in-memory store
 * (same pattern as `localForageCoachSettingsRepository.test.ts`).
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
import type { CoachTurn } from "./coachState";

const resetStore = async (): Promise<void> => {
  await vi.mocked(localforage).__resetMock();
  vi.mocked(localforage.createInstance).mockClear();
};

/** Build a turn with sensible defaults for tests. */
const makeTurn = (overrides: Partial<CoachTurn> = {}): CoachTurn => ({
  id: overrides.id ?? "turn-1",
  timestamp: overrides.timestamp ?? ("2026-06-10T12:00:00Z" as never),
  userPrompt: overrides.userPrompt ?? "What should I do?",
  narration: overrides.narration ?? {
    text: "Save 5 EUR.",
    source: "deterministic" as const,
    actionCount: 1,
  },
});

describe("localForageCoachStateRepository", () => {
  beforeEach(async () => {
    await resetStore();
  });

  afterEach(async () => {
    await resetStore();
  });

  it("get() returns an empty list when no state has been saved", async () => {
    const { localForageCoachStateRepository } = await import(
      "./localForageCoachStateRepository"
    );
    const repo = new localForageCoachStateRepository();
    const back = await repo.get();
    expect(back).toEqual([]);
  });

  it("save → get round-trips the full turn list", async () => {
    const { localForageCoachStateRepository } = await import(
      "./localForageCoachStateRepository"
    );
    const repo = new localForageCoachStateRepository();
    const turns = [
      makeTurn({ id: "t1", userPrompt: "q1" }),
      makeTurn({ id: "t2", userPrompt: "q2" }),
    ];
    await repo.save(turns);
    const back = await repo.get();
    expect(back).toHaveLength(2);
    expect(back[0]?.id).toBe("t1");
    expect(back[1]?.userPrompt).toBe("q2");
  });

  it("save() caps the persisted list at 20 turns (saving 25 keeps the latest 20)", async () => {
    const { localForageCoachStateRepository } = await import(
      "./localForageCoachStateRepository"
    );
    const repo = new localForageCoachStateRepository();
    const turns = Array.from({ length: 25 }, (_, i) =>
      makeTurn({ id: `t${i + 1}`, userPrompt: `q${i + 1}` }),
    );
    await repo.save(turns);
    const back = await repo.get();
    expect(back).toHaveLength(20);
    // The cap drops the OLDEST 5 and keeps the latest 20.
    expect(back[0]?.id).toBe("t6");
    expect(back[19]?.id).toBe("t25");
  });

  it("save() with fewer than 20 turns is a no-op for the cap", async () => {
    const { localForageCoachStateRepository } = await import(
      "./localForageCoachStateRepository"
    );
    const repo = new localForageCoachStateRepository();
    const turns = Array.from({ length: 7 }, (_, i) =>
      makeTurn({ id: `t${i + 1}` }),
    );
    await repo.save(turns);
    const back = await repo.get();
    expect(back).toHaveLength(7);
    expect(back[0]?.id).toBe("t1");
    expect(back[6]?.id).toBe("t7");
  });

  it("save() overwrites the previous list", async () => {
    const { localForageCoachStateRepository } = await import(
      "./localForageCoachStateRepository"
    );
    const repo = new localForageCoachStateRepository();
    await repo.save([makeTurn({ id: "t1" })]);
    await repo.save([makeTurn({ id: "t2" }), makeTurn({ id: "t3" })]);
    const back = await repo.get();
    expect(back).toHaveLength(2);
    expect(back[0]?.id).toBe("t2");
    expect(back[1]?.id).toBe("t3");
  });

  it("get() preserves the narration source on each turn", async () => {
    const { localForageCoachStateRepository } = await import(
      "./localForageCoachStateRepository"
    );
    const repo = new localForageCoachStateRepository();
    const turns = [
      makeTurn({
        id: "t1",
        narration: {
          text: "ok",
          source: "ollama",
          actionCount: 1,
        },
      }),
      makeTurn({
        id: "t2",
        narration: {
          text: "fallback",
          source: "deterministic",
          actionCount: 1,
        },
      }),
    ];
    await repo.save(turns);
    const back = await repo.get();
    expect(back[0]?.narration.source).toBe("ollama");
    expect(back[1]?.narration.source).toBe("deterministic");
  });
});
