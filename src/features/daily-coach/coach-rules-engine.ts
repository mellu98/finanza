/**
 * Coach rules engine — the deterministic composition root.
 *
 * Consumes the daily-budget result, transactions, savings goals, debts,
 * plan, and settings, and emits a `CoachDecision`:
 *   - mode        (steady | recovery | survival | growth)
 *   - priority    (debt-first | standard)
 *   - actions     (≤ 3, priority-capped via `ACTION_PRIORITY_ORDER`)
 *   - blockedCategories / reducedCategories
 *   - alerts
 *
 * Pure TS — no React, no fetch, no localforage, no `new Date()`. The
 * engine never recomputes the daily budget or overspend recovery; the
 * caller passes pre-computed values in `DailyBudgetResult`.
 *
 * Implementation note: the orchestrator function is split into a dozen
 * small `apply*` helpers so each fits under the Biome cognitive-complexity
 * budget. The main function just sequences them.
 */
import Big from "big.js";
import {
  ACTION_PRIORITY_ORDER,
  ActionKind,
  AVOIDABLE_SHARE_THRESHOLD,
  CoachMode,
  RED_SPEND_THRESHOLD,
  RED_SPEND_WINDOW_DAYS,
} from "./constants";
import type {
  CoachSettings,
  DailyBudgetResult,
  Debt,
  MonthlyPlan,
  SavingsGoal,
  Transaction,
} from "./domain";
import {
  EngineError,
  type EngineErrorDetail,
  engineErr,
  ok,
  type Result,
} from "./engineErrors";
import { daysBetween, type IsoDate } from "./isoDate";
import type { DisplayMoney, Money } from "./money";
import { roundBig, roundHalfUp } from "./money";
import { isSurvival } from "./survival-mode";

const ZERO = new Big(0);
const DEBT_URGENT_WINDOW_DAYS = 14;

export interface CoachAction {
  kind: import("./constants").ActionKind;
  /** Short label rendered in the UI / narrated by the AI coach. */
  label: string;
  /** Set when the action targets a specific category (freeze/block). */
  category?: string;
  /** Set when the action suggests a money amount (allocate/save). */
  amount?: DisplayMoney;
  /** Set when the action has a fixed duration (block-category). */
  durationDays?: number;
  /** 0 = highest priority. */
  priority: number;
}

export interface CoachAlert {
  kind: import("./constants").ActionKind;
  severity: "info" | "warn" | "error";
}

export type CoachPriority = "debt-first" | "standard";

export interface CoachDecision {
  mode: import("./constants").CoachMode;
  priority: CoachPriority;
  actions: ReadonlyArray<CoachAction>;
  blockedCategories: ReadonlyArray<string>;
  reducedCategories: ReadonlyArray<string>;
  alerts: ReadonlyArray<CoachAlert>;
}

export interface CoachRulesInput {
  daily: DailyBudgetResult;
  txs: ReadonlyArray<Transaction>;
  goals: ReadonlyArray<SavingsGoal>;
  debts: ReadonlyArray<Debt>;
  plan: MonthlyPlan;
  settings: CoachSettings;
  today: IsoDate;
}

/* ---------- shared reduction helpers ---------- */

const sumIncome = (txs: ReadonlyArray<Transaction>): Money => {
  let total = ZERO;
  for (const t of txs) if (t.type === "income") total = total.plus(t.amount);
  return total;
};

const sumAvoidable = (txs: ReadonlyArray<Transaction>): Money => {
  let total = ZERO;
  for (const t of txs) {
    if (t.type === "expense" && t.classification === "avoidable") {
      total = total.plus(t.amount);
    }
  }
  return total;
};

const avoidableInWindow = (
  txs: ReadonlyArray<Transaction>,
  fromIso: IsoDate,
  toIso: IsoDate,
): Money => {
  let total = ZERO;
  for (const t of txs) {
    if (
      t.type === "expense" &&
      t.classification === "avoidable" &&
      t.date >= fromIso &&
      t.date <= toIso
    ) {
      total = total.plus(t.amount);
    }
  }
  return total;
};

const avoidableByCategory = (
  txs: ReadonlyArray<Transaction>,
  fromIso: IsoDate,
  toIso: IsoDate,
): Map<string, Money> => {
  const acc = new Map<string, Money>();
  for (const t of txs) {
    if (
      t.type === "expense" &&
      t.classification === "avoidable" &&
      t.date >= fromIso &&
      t.date <= toIso
    ) {
      acc.set(t.category, (acc.get(t.category) ?? ZERO).plus(t.amount));
    }
  }
  return acc;
};

const findDominant = (
  byCat: Map<string, Money>,
): {
  category: string;
  amount: Money;
} | null => {
  let dominantCategory = "";
  let dominantAmount = ZERO;
  for (const [cat, amt] of byCat) {
    if (amt.gt(dominantAmount)) {
      dominantCategory = cat;
      dominantAmount = amt;
    }
  }
  return dominantCategory
    ? { category: dominantCategory, amount: dominantAmount }
    : null;
};

const windowStartIso = (today: IsoDate, daysBack: number): IsoDate => {
  const [y, m, d] = today.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - (daysBack - 1));
  const yy = dt.getUTCFullYear().toString().padStart(4, "0");
  const mm = (dt.getUTCMonth() + 1).toString().padStart(2, "0");
  const dd = dt.getUTCDate().toString().padStart(2, "0");
  return `${yy}-${mm}-${dd}` as IsoDate;
};

/* ---------- per-rule helpers (one per spec scenario) ---------- */

const applyAvoidableShareAlert = (
  txs: ReadonlyArray<Transaction>,
): { candidates: CoachAction[]; alerts: CoachAlert[] } => {
  const candidates: CoachAction[] = [];
  const alerts: CoachAlert[] = [];
  const income = sumIncome(txs);
  if (income.lte(ZERO)) return { candidates, alerts };
  const avoidable = sumAvoidable(txs);
  const share = avoidable.div(income).toNumber();
  if (share <= AVOIDABLE_SHARE_THRESHOLD) return { candidates, alerts };
  alerts.push({ kind: ActionKind.AlertAvoidableShare, severity: "warn" });
  candidates.push({
    kind: ActionKind.AlertAvoidableShare,
    label: `Avoidable spending is ${(share * 100).toFixed(0)}% of income.`,
    priority: ACTION_PRIORITY_ORDER.indexOf(ActionKind.AlertAvoidableShare),
  });
  return { candidates, alerts };
};

const applySurvivalMode = (
  daily: DailyBudgetResult,
  txs: ReadonlyArray<Transaction>,
): { mode: CoachMode; blocked: Set<string>; reduced: Set<string> } => {
  const blocked = new Set<string>();
  const reduced = new Set<string>();
  if (!isSurvival(new Big(daily.dailyBudgetRounded))) {
    return { mode: CoachMode.Steady, blocked, reduced };
  }
  for (const t of txs) {
    if (t.type === "expense" && t.classification === "avoidable") {
      blocked.add(t.category);
    }
    if (t.type === "expense" && t.classification === "controllable") {
      reduced.add(t.category);
    }
  }
  return { mode: CoachMode.Survival, blocked, reduced };
};

const applyRecovery = (
  daily: DailyBudgetResult,
  txs: ReadonlyArray<Transaction>,
  today: IsoDate,
): { mode: CoachMode; candidates: CoachAction[] } => {
  if (daily.spentToday <= daily.dailyBudgetRounded) {
    return { mode: CoachMode.Steady, candidates: [] };
  }
  const byCat = new Map<string, Money>();
  for (const t of txs) {
    if (t.type === "expense" && t.date === today) {
      byCat.set(t.category, (byCat.get(t.category) ?? ZERO).plus(t.amount));
    }
  }
  const dom = findDominant(byCat);
  if (!dom) return { mode: CoachMode.Recovery, candidates: [] };
  return {
    mode: CoachMode.Recovery,
    candidates: [
      {
        kind: ActionKind.FreezeCategory,
        label: `Freeze "${dom.category}" for the rest of the period.`,
        category: dom.category,
        priority: ACTION_PRIORITY_ORDER.indexOf(ActionKind.FreezeCategory),
      },
    ],
  };
};

const collectCategoryStats = (
  txs: ReadonlyArray<Transaction>,
): {
  byCat: Map<string, Money>;
  categoryHasBudget: Set<string>;
} => {
  const byCat = new Map<string, Money>();
  const categoryHasBudget = new Set<string>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    byCat.set(t.category, (byCat.get(t.category) ?? ZERO).plus(t.amount));
    if (t.categoryBudget !== undefined) {
      categoryHasBudget.add(t.category);
    }
  }
  return { byCat, categoryHasBudget };
};

const perCategoryBudgetExcess = (
  txs: ReadonlyArray<Transaction>,
): CoachAction[] => {
  const out: CoachAction[] = [];
  for (const t of txs) {
    if (t.type !== "expense") continue;
    if (t.categoryBudget === undefined) continue;
    if (t.amount.gt(t.categoryBudget)) {
      out.push({
        kind: ActionKind.FreezeCategory,
        label: `Freeze "${t.category}" — over the per-category budget (${t.amount.toFixed(2)} > ${t.categoryBudget.toFixed(2)}).`,
        category: t.category,
        priority: ACTION_PRIORITY_ORDER.indexOf(ActionKind.FreezeCategory),
      });
    }
  }
  return out;
};

const heuristicExcess = (
  byCat: ReadonlyMap<string, Money>,
  categoryHasBudget: ReadonlySet<string>,
  implicitBudget: Money,
): CoachAction[] => {
  const out: CoachAction[] = [];
  for (const [cat, spent] of byCat) {
    if (categoryHasBudget.has(cat)) continue;
    if (spent.gt(implicitBudget)) {
      out.push({
        kind: ActionKind.FreezeCategory,
        label: `Freeze "${cat}" — over the per-category budget.`,
        category: cat,
        priority: ACTION_PRIORITY_ORDER.indexOf(ActionKind.FreezeCategory),
      });
    }
  }
  return out;
};

const applyPerCategoryFreeze = (
  txs: ReadonlyArray<Transaction>,
  plan: MonthlyPlan,
  daily: DailyBudgetResult,
): CoachAction[] => {
  // Two paths (carry-forward of PR2 deviation #3 — resolved in PR6):
  //   1. PER-CATEGORY BUDGET: when a transaction carries its own
  //      `categoryBudget`, that becomes the per-category cap. If the
  //      transaction's amount exceeds it, the category is frozen. As
  //      soon as ANY transaction in a category declares a budget, the
  //      30% heuristic is SUPPRESSED for that category — the user's
  //      explicit cap wins.
  //   2. 30% HEURISTIC FALLBACK: for categories where NO transaction
  //      carries a budget, fall back to the legacy 30%-of-period-pool
  //      heuristic. This keeps the engine's behaviour a strict SUPERSET
  //      of the pre-PR6 code (no breaking change for users who never
  //      set a category budget).
  const { byCat, categoryHasBudget } = collectCategoryStats(txs);
  const budgetExcess = perCategoryBudgetExcess(txs);
  // 30% of the period pool is the per-category implicit budget.
  const implicitBudget = new Big(daily.dailyBudgetRounded)
    .times(new Big(plan.daysRemaining))
    .times(new Big("0.3"));
  const fallbackExcess = heuristicExcess(
    byCat,
    categoryHasBudget,
    implicitBudget,
  );
  return [...budgetExcess, ...fallbackExcess];
};

const applyExtraIncome = (
  txs: ReadonlyArray<Transaction>,
  plan: MonthlyPlan,
  goals: ReadonlyArray<SavingsGoal>,
): CoachAction[] => {
  const income = sumIncome(txs);
  if (income.lte(plan.expectedIncomeUntilPeriodEnd)) return [];
  const extra = income.minus(plan.expectedIncomeUntilPeriodEnd);
  const emergencyShare = roundBig(extra.times(new Big("0.5")), 2);
  const emergencyGoal = goals.find((g) => g.emergencyFund);
  const label = emergencyGoal
    ? `Allocate ${emergencyShare} € to the emergency fund.`
    : `Allocate ${emergencyShare} € to savings (no emergency goal flagged).`;
  return [
    {
      kind: ActionKind.AllocateExtra,
      label,
      amount: emergencyShare,
      priority: ACTION_PRIORITY_ORDER.indexOf(ActionKind.AllocateExtra),
    },
  ];
};

const applyRedSpendBlock = (
  txs: ReadonlyArray<Transaction>,
  today: IsoDate,
): CoachAction[] => {
  const fromIso = windowStartIso(today, RED_SPEND_WINDOW_DAYS);
  const total = avoidableInWindow(txs, fromIso, today);
  if (total.lte(new Big(RED_SPEND_THRESHOLD))) return [];
  const dom = findDominant(avoidableByCategory(txs, fromIso, today));
  if (!dom) return [];
  return [
    {
      kind: ActionKind.BlockCategory,
      label: `Block "${dom.category}" for ${RED_SPEND_WINDOW_DAYS} days (red-spend).`,
      category: dom.category,
      durationDays: RED_SPEND_WINDOW_DAYS,
      priority: ACTION_PRIORITY_ORDER.indexOf(ActionKind.BlockCategory),
    },
  ];
};

const applyDebtFirst = (
  debts: ReadonlyArray<Debt>,
  today: IsoDate,
): { priority: CoachPriority; candidates: CoachAction[] } => {
  const urgent = debts.find(
    (d) =>
      d.priority === 1 &&
      daysBetween(today, d.nextDueDate) >= 0 &&
      daysBetween(today, d.nextDueDate) <= DEBT_URGENT_WINDOW_DAYS,
  );
  if (!urgent) return { priority: "standard", candidates: [] };
  return {
    priority: "debt-first",
    candidates: [
      {
        kind: ActionKind.PayDebtUrgent,
        label: `Pay ${urgent.creditor} before any non-essential spend.`,
        priority: ACTION_PRIORITY_ORDER.indexOf(ActionKind.PayDebtUrgent),
      },
    ],
  };
};

const applySurplus = (
  daily: DailyBudgetResult,
  debtFirst: boolean,
): CoachAction[] => {
  if (debtFirst) return [];
  const surplus = daily.dailyBudgetRounded - daily.spentToday;
  if (surplus <= 0) return [];
  const saveAmount = roundHalfUp(
    new Big(surplus).times(new Big("0.5")),
    2,
  ).toNumber();
  return [
    {
      kind: ActionKind.SaveSurplus,
      label: `Save ${saveAmount} € (50% of today's surplus).`,
      amount: saveAmount,
      priority: ACTION_PRIORITY_ORDER.indexOf(ActionKind.SaveSurplus),
    },
  ];
};

/* ---------- main entry point ---------- */

export const evaluateCoachRules = (
  input: CoachRulesInput,
): Result<CoachDecision, EngineErrorDetail> => {
  const { daily, txs, goals, debts, plan, today } = input;
  // `settings` is part of the public input contract (the UI may pass
  // per-user priorities here in v1.1). The current engine doesn't
  // override defaults from settings, but we keep the binding so
  // downstream `actionPriorityOrder` overrides can land without an API
  // change.
  void ({} as CoachSettings);

  if (!Number.isFinite(daily.dailyBudgetRounded)) {
    return engineErr(
      EngineError.InvalidInput,
      "daily.dailyBudgetRounded is not finite",
      { daily },
    );
  }

  const candidates: CoachAction[] = [];
  const alerts: CoachAlert[] = [];
  let mode: CoachMode = CoachMode.Steady;
  const blockedCategories = new Set<string>();
  const reducedCategories = new Set<string>();

  // 1. avoidable-share alert
  const alertResult = applyAvoidableShareAlert(txs);
  candidates.push(...alertResult.candidates);
  alerts.push(...alertResult.alerts);

  // 2. survival mode (may override mode + blocked/reduced)
  const survival = applySurvivalMode(daily, txs);
  mode = survival.mode;
  for (const c of survival.blocked) blockedCategories.add(c);
  for (const c of survival.reduced) reducedCategories.add(c);

  // 3. recovery (may override mode IF not already survival)
  const recovery = applyRecovery(daily, txs, today);
  if (recovery.mode !== CoachMode.Steady) mode = recovery.mode;
  candidates.push(...recovery.candidates);

  // 4. per-category freeze
  candidates.push(...applyPerCategoryFreeze(txs, plan, daily));

  // 5. extra-income allocation
  candidates.push(...applyExtraIncome(txs, plan, goals));

  // 6. red-spend 7-day block
  candidates.push(...applyRedSpendBlock(txs, today));

  // 7. debt-first priority
  const debt = applyDebtFirst(debts, today);
  candidates.push(...debt.candidates);

  // 8. daily surplus savings (suppressed under debt-first)
  candidates.push(...applySurplus(daily, debt.priority === "debt-first"));

  // 9. cap at 3 by priority
  candidates.sort((a, b) => a.priority - b.priority);
  const actions = candidates.slice(0, 3);

  // 10. blocked list: union of categories we froze + categories in survival
  for (const a of actions) {
    if (a.kind === ActionKind.FreezeCategory && a.category) {
      blockedCategories.add(a.category);
    }
  }

  const decision: CoachDecision = {
    mode,
    priority: debt.priority,
    actions,
    blockedCategories: Array.from(blockedCategories),
    reducedCategories: Array.from(reducedCategories),
    alerts,
  };
  return ok(decision);
};
