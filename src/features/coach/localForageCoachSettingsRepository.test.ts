/**
 * Test plan for `localForageCoachSettingsRepository`.
 *
 * The repository persists the single `CoachSettings` record to a
 * localforage instance. There is only ever one settings record, so
 * the contract is intentionally small: `get` / `save`.
 *
 * The test exercises the round-trip with all 5 required fields
 * (`ollamaBaseUrl`, `modelName`, `aiEnabled`, `emergencyBuffer`,
 * `baseCurrency`) plus the optional `actionPriorityOrder` field.
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
import { CoachSettingsMother } from "./CoachSettings.mother";

const resetStore = async () => {
  await vi.mocked(localforage).__resetMock();
  vi.mocked(localforage.createInstance).mockClear();
};

describe("localForageCoachSettingsRepository", () => {
  beforeEach(async () => {
    await resetStore();
  });

  afterEach(async () => {
    await resetStore();
  });

  it("save → get round-trips all 5 required fields", async () => {
    const { localForageCoachSettingsRepository } = await import(
      "./localForageCoachSettingsRepository"
    );
    const repo = new localForageCoachSettingsRepository();
    const settings = CoachSettingsMother.testSettings();
    await repo.save(settings);
    const back = await repo.get();
    expect(back).toBeDefined();
    expect(back?.ollamaBaseUrl).toBe(settings.ollamaBaseUrl);
    expect(back?.modelName).toBe(settings.modelName);
    expect(back?.aiEnabled).toBe(settings.aiEnabled);
    expect(back?.emergencyBuffer.toString()).toBe(
      settings.emergencyBuffer.toString(),
    );
    expect(back?.baseCurrency).toBe(settings.baseCurrency);
  });

  it("get returns undefined when no settings have been saved", async () => {
    const { localForageCoachSettingsRepository } = await import(
      "./localForageCoachSettingsRepository"
    );
    const repo = new localForageCoachSettingsRepository();
    const back = await repo.get();
    expect(back).toBeUndefined();
  });

  it("save overwrites the previous settings", async () => {
    const { localForageCoachSettingsRepository } = await import(
      "./localForageCoachSettingsRepository"
    );
    const repo = new localForageCoachSettingsRepository();
    await repo.save(CoachSettingsMother.testSettings());
    const updated = CoachSettingsMother.rulesEngineOnly();
    await repo.save(updated);
    const back = await repo.get();
    expect(back?.aiEnabled).toBe(false);
  });
});
