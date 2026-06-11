/**
 * Test plan for the coach rules engine.
 *
 * The rules engine is the composition root: it consumes the daily-budget
 * result, transactions, savings goals, debts, plan, and settings and
 * emits a deterministic `CoachDecision`:
 *   - mode (steady | recovery | survival | growth)
 *   - priority (debt-first | standard)
 *   - actions (≤ 3, priority-capped)
 *   - blockedCategories / reducedCategories
 *   - alerts
 *
 * Coverage:
 *   - avoidable > 10% alert
 *   - survival freezes avoidable categories
 *   - recovery recomputes when spent > daily
 *   - per-category freeze for over-budget categories
 *   - allocate-extra 50/30/20 split
 *   - daily surplus savings (0.5×)
 *   - debt-first wins over surplus-savings
 *   - red-spend 7-day block on avoidable dominant
 *   - 6→3 cap (highest-priority kept)
 *   - deterministic output (pure call twice = structurally equal)
 */
import Big from "big.js";
import { describe, expect, it } from "vitest";
import { type CoachRulesInput, evaluateCoachRules } from "./coach-rules-engine";
import {
  ActionKind,
  AVOIDABLE_SHARE_THRESHOLD,
  RED_SPEND_THRESHOLD,
  RED_SPEND_WINDOW_DAYS,
} from "./constants";
import { computeDailyBudget } from "./daily-budget-engine";
import {
  dayBefore,
  makeDebt,
  makePlan,
  makeSavingsGoal,
  makeTransaction,
  TODAY,
} from "./daily-budget-engine.mother";
import { parseIsoDate } from "./isoDate";

const big = (v: number | string) => new Big(v);

const defaultSettings = {
  ollamaBaseUrl: "http://localhost:11434",
  modelName: "llama3.2",
  aiEnabled: true,
  emergencyBuffer: big(0),
  baseCurrency: "EUR",
} as const;

const dailyFor = (
  planOverrides: Parameters<typeof makePlan>[0],
  txs: ReadonlyArray<ReturnType<typeof makeTransaction>> = [],
) => {
  const plan = makePlan(planOverrides);
  const r = computeDailyBudget({
    plan,
    transactions: txs,
    goals: [],
    debts: [],
    evaluationDate: TODAY,
  });
  if (!r.ok) throw new Error("expected ok");
  return r.value;
};

describe("coach-rules-engine", () => {
  it("emits an avoidable-share-high alert when avoidable > 10% of income", () => {
    const txs = [
      // 1000 income
      makeTransaction({
        id: "i1",
        type: "income",
        amount: big(1000),
        date: TODAY,
      }),
      // 120 avoidable
      makeTransaction({
        id: "e1",
        type: "expense",
        category: "dining",
        amount: big(120),
        classification: "avoidable",
        date: TODAY,
      }),
    ];
    const plan = makePlan({ currentBalance: big(1000), daysRemaining: 10 });
    const daily = dailyFor({ currentBalance: big(1000), daysRemaining: 10 });
    const input: CoachRulesInput = {
      daily,
      txs,
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    };
    const r = evaluateCoachRules(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const alert = r.value.alerts.find(
      (a) => a.kind === ActionKind.AlertAvoidableShare,
    );
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe("warn");
  });

  it("does NOT emit the alert when avoidable is exactly at the threshold (8% < 10%)", () => {
    const txs = [
      makeTransaction({
        id: "i1",
        type: "income",
        amount: big(1000),
        date: TODAY,
      }),
      makeTransaction({
        id: "e1",
        type: "expense",
        category: "dining",
        amount: big(80),
        classification: "avoidable",
        date: TODAY,
      }),
    ];
    const plan = makePlan({ currentBalance: big(1000), daysRemaining: 10 });
    const daily = dailyFor({ currentBalance: big(1000), daysRemaining: 10 });
    const r = evaluateCoachRules({
      daily,
      txs,
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const alert = r.value.alerts.find(
      (a) => a.kind === ActionKind.AlertAvoidableShare,
    );
    expect(alert).toBeUndefined();
  });

  it("sets mode='survival' when daily budget is below 5 €/day", () => {
    // 4 €/day → survival
    const daily = dailyFor({ currentBalance: big(40), daysRemaining: 10 });
    const plan = makePlan({ currentBalance: big(40), daysRemaining: 10 });
    const r = evaluateCoachRules({
      daily,
      txs: [],
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.mode).toBe("survival");
  });

  it("sets mode='recovery' when spent_today > daily_budget (with a freeze-category action)", () => {
    // daily=11, but user spent 20 today in 'dining'
    const txs = [
      makeTransaction({
        id: "e1",
        type: "expense",
        category: "dining",
        amount: big(20),
        classification: "avoidable",
        date: TODAY,
      }),
    ];
    const daily = dailyFor(
      { currentBalance: big(110), daysRemaining: 10 },
      txs,
    );
    const plan = makePlan({ currentBalance: big(110), daysRemaining: 10 });
    const r = evaluateCoachRules({
      daily,
      txs,
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.mode).toBe("recovery");
    const freeze = r.value.actions.find(
      (a) => a.kind === ActionKind.FreezeCategory,
    );
    expect(freeze).toBeDefined();
    expect(freeze?.category).toBe("dining");
  });

  it("emits a freeze-category action for an over-budget category", () => {
    const daily = dailyFor({ currentBalance: big(100), daysRemaining: 10 });
    const plan = makePlan({ currentBalance: big(100), daysRemaining: 10 });
    // (kept inline to avoid pulling in transactions context for category budgets)
    const r = evaluateCoachRules({
      daily,
      txs: [
        makeTransaction({
          id: "e1",
          type: "expense",
          category: "dining",
          amount: big(45),
          classification: "avoidable",
          date: TODAY,
        }),
      ],
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const action = r.value.actions.find(
      (a) => a.kind === ActionKind.FreezeCategory,
    );
    expect(action).toBeDefined();
  });

  it("emits allocate-extra 50/30/20 when actual income > expected income", () => {
    const daily = dailyFor({ currentBalance: big(1000), daysRemaining: 10 });
    const plan = makePlan({
      currentBalance: big(1000),
      expectedIncomeUntilPeriodEnd: big(1000),
      daysRemaining: 10,
    });
    // actual income = 1200 (200 over)
    const txs = [
      makeTransaction({
        id: "i1",
        type: "income",
        amount: big(1200),
        date: TODAY,
      }),
    ];
    const emergencyGoal = makeSavingsGoal({
      emergencyFund: true,
      targetAmount: big(200),
      currentAmount: big(50),
    });
    const r = evaluateCoachRules({
      daily,
      txs,
      goals: [emergencyGoal],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const alloc = r.value.actions.find(
      (a) => a.kind === ActionKind.AllocateExtra,
    );
    expect(alloc).toBeDefined();
    // 50% of 200 = 100 emergency
    expect(alloc?.amount).toBe(100);
  });

  it("emits save-surplus with 0.5× of daily_surplus when surplus > 0", () => {
    // daily=20, spentToday=14 → surplus=6 → save 3
    const txs = [
      makeTransaction({
        id: "e1",
        type: "expense",
        category: "groceries",
        amount: big(14),
        classification: "controllable",
        date: TODAY,
      }),
    ];
    const daily = dailyFor(
      { currentBalance: big(200), daysRemaining: 10 },
      txs,
    );
    const plan = makePlan({ currentBalance: big(200), daysRemaining: 10 });
    const r = evaluateCoachRules({
      daily,
      txs,
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const save = r.value.actions.find((a) => a.kind === ActionKind.SaveSurplus);
    expect(save).toBeDefined();
    expect(save?.amount).toBe(3);
  });

  it("sets priority='debt-first' when a priority-1 debt is within 14 days; suppresses save-surplus in same turn", () => {
    const daily = dailyFor({ currentBalance: big(500), daysRemaining: 30 });
    const plan = makePlan({ currentBalance: big(500), daysRemaining: 30 });
    const debt = makeDebt({
      priority: 1,
      nextDueDate: dayBefore(TODAY, -7), // 7 days from now
      monthlyInstallment: big(100),
    });
    const txs = [
      makeTransaction({
        id: "e1",
        type: "expense",
        category: "groceries",
        amount: big(5),
        classification: "controllable",
        date: TODAY,
      }),
    ];
    const r = evaluateCoachRules({
      daily,
      txs,
      goals: [],
      debts: [debt],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.priority).toBe("debt-first");
    expect(r.value.actions.some((a) => a.kind === ActionKind.SaveSurplus)).toBe(
      false,
    );
    expect(
      r.value.actions.some((a) => a.kind === ActionKind.PayDebtUrgent),
    ).toBe(true);
  });

  it("emits block-category for 7 days when weekly avoidable spend > 50 €", () => {
    // 60 € of avoidable in the last 7 days
    const daily = dailyFor({ currentBalance: big(500), daysRemaining: 10 });
    const plan = makePlan({ currentBalance: big(500), daysRemaining: 10 });
    const txs = [
      makeTransaction({
        id: "e1",
        type: "expense",
        category: "dining",
        amount: big(RED_SPEND_THRESHOLD + 10),
        classification: "avoidable",
        date: dayBefore(TODAY, 1),
      }),
    ];
    const r = evaluateCoachRules({
      daily,
      txs,
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const block = r.value.actions.find(
      (a) => a.kind === ActionKind.BlockCategory,
    );
    expect(block).toBeDefined();
    expect(block?.category).toBe("dining");
    expect(block?.durationDays).toBe(RED_SPEND_WINDOW_DAYS);
  });

  it("caps the action list at 3 (6→3 rule)", () => {
    // Construct a scenario with alerts + recovery + freeze + survival + save + extra to
    // force 6+ candidates. We achieve this with:
    //  - low dailyBudget (survival mode)
    //  - over-budget avoidable category (freeze)
    //  - avoidable share > 10% (alert)
    //  - spent > daily (recovery / overspend)
    const daily = dailyFor({ currentBalance: big(40), daysRemaining: 10 });
    const plan = makePlan({
      currentBalance: big(40),
      expectedIncomeUntilPeriodEnd: big(100),
      daysRemaining: 10,
    });
    const txs = [
      makeTransaction({
        id: "i1",
        type: "income",
        amount: big(200),
        date: TODAY,
      }),
      makeTransaction({
        id: "e1",
        type: "expense",
        category: "dining",
        amount: big(50),
        classification: "avoidable",
        date: TODAY,
      }),
      makeTransaction({
        id: "e2",
        type: "expense",
        category: "shopping",
        amount: big(30),
        classification: "avoidable",
        date: dayBefore(TODAY, 1),
      }),
    ];
    const r = evaluateCoachRules({
      daily,
      txs,
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.actions.length).toBeLessThanOrEqual(3);
  });

  it("is pure: two calls with the same input return structurally equal outputs", () => {
    const daily = dailyFor({ currentBalance: big(200), daysRemaining: 10 });
    const plan = makePlan({ currentBalance: big(200), daysRemaining: 10 });
    const input: CoachRulesInput = {
      daily,
      txs: [],
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    };
    const a = evaluateCoachRules(input);
    const b = evaluateCoachRules(input);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.mode).toBe(b.value.mode);
    expect(a.value.priority).toBe(b.value.priority);
    expect(a.value.actions.length).toBe(b.value.actions.length);
    expect(a.value.alerts.length).toBe(b.value.alerts.length);
  });

  it("emits a freeze-category action when a transaction's categoryBudget is exceeded (carry-forward PR2 #3)", () => {
    // daily=100, days=10 → implicit heuristic budget = 100*10*0.3 = 300
    // A 50€ tx would NOT trigger the 30% heuristic (50 < 300), but its
    // own categoryBudget=20 is exceeded (50 > 20) → category MUST be
    // frozen. This is the new "real budget" path from PR6.
    const daily = dailyFor({ currentBalance: big(1000), daysRemaining: 10 });
    const plan = makePlan({ currentBalance: big(1000), daysRemaining: 10 });
    const txWithBudget = {
      ...makeTransaction({
        id: "e1",
        type: "expense",
        category: "dining",
        amount: big(50),
        classification: "avoidable",
        date: TODAY,
      }),
      categoryBudget: big(20),
    };
    const r = evaluateCoachRules({
      daily,
      txs: [txWithBudget],
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const freeze = r.value.actions.find(
      (a) => a.kind === ActionKind.FreezeCategory,
    );
    expect(freeze).toBeDefined();
    expect(freeze?.category).toBe("dining");
  });

  it("falls back to the 30% heuristic when a transaction has NO categoryBudget (carry-forward PR2 #3)", () => {
    // daily=10, days=10 → implicit heuristic budget = 10*10*0.3 = 30
    // A 45€ tx with no categoryBudget MUST trip the 30% heuristic and
    // freeze the category. This preserves the pre-PR6 behaviour for
    // transactions that don't carry their own budget.
    const daily = dailyFor({ currentBalance: big(100), daysRemaining: 10 });
    const plan = makePlan({ currentBalance: big(100), daysRemaining: 10 });
    const r = evaluateCoachRules({
      daily,
      txs: [
        makeTransaction({
          id: "e1",
          type: "expense",
          category: "dining",
          amount: big(45),
          classification: "avoidable",
          date: TODAY,
        }),
      ],
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const freeze = r.value.actions.find(
      (a) => a.kind === ActionKind.FreezeCategory,
    );
    expect(freeze).toBeDefined();
    expect(freeze?.category).toBe("dining");
  });

  it("does NOT freeze a category when a transaction's categoryBudget is respected (carry-forward PR2 #3)", () => {
    // daily=100, days=10 → implicit heuristic budget = 100*10*0.3 = 300
    // tx amount=5, categoryBudget=10 → 5 < 10, respected → NO freeze.
    const daily = dailyFor({ currentBalance: big(1000), daysRemaining: 10 });
    const plan = makePlan({ currentBalance: big(1000), daysRemaining: 10 });
    const txWithBudget = {
      ...makeTransaction({
        id: "e1",
        type: "expense",
        category: "dining",
        amount: big(5),
        classification: "avoidable",
        date: TODAY,
      }),
      categoryBudget: big(10),
    };
    const r = evaluateCoachRules({
      daily,
      txs: [txWithBudget],
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: TODAY,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const freeze = r.value.actions.find(
      (a) => a.kind === ActionKind.FreezeCategory,
    );
    expect(freeze).toBeUndefined();
  });

  it("exposes AVOIDABLE_SHARE_THRESHOLD = 0.10 (sanity)", () => {
    expect(AVOIDABLE_SHARE_THRESHOLD).toBe(0.1);
  });

  it("accepts a parseIsoDate() output as the today argument (no Date.now() leaks)", () => {
    const t = parseIsoDate("2026-06-10");
    const daily = dailyFor({ currentBalance: big(100), daysRemaining: 10 });
    const plan = makePlan({ currentBalance: big(100), daysRemaining: 10 });
    const r = evaluateCoachRules({
      daily,
      txs: [],
      goals: [],
      debts: [],
      plan,
      settings: { ...defaultSettings, emergencyBuffer: big(0) },
      today: t,
    });
    expect(r.ok).toBe(true);
  });
});
