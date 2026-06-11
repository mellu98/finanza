/**
 * Test plan for the `useDailyBudget` composition hook.
 *
 * `useDailyBudget()` is the single point of integration between the 5
 * per-feature contexts (MonthlyPlan, Transactions, SavingsGoals, Debts,
 * CoachSettings) and the two deterministic engines
 * (`computeDailyBudget` + `evaluateCoachRules`). The dashboard cards
 * all consume the hook's memoized result, so any bug here is visible
 * to the user immediately.
 *
 * The contract under test:
 *   - returns `null` when no plan is set (first-run state);
 *   - returns `{ daily, decision }` when a plan exists;
 *   - `daily` is a `DailyBudgetResult` (status + numbers);
 *   - `decision` is a `CoachDecision` (mode + actions + alerts);
 *   - the hook accepts an injectable `today: IsoDate` so tests can
 *     pin the calendar.
 *
 * We mock the 5 context hooks at the module level via `vi.spyOn` and
 * feed them fixture data shaped by the per-feature `*.mother.ts`
 * classes. The real engines run unmodified — we are testing the
 * composition, not the engines (those are covered by their own tests).
 */
import { render, screen } from "@testing-library/react";
import Big from "big.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoachSettingsMother } from "../coach/CoachSettings.mother";
import * as CoachSettingsHook from "../coach/useCoachSettings";
import { DebtMother } from "../debts/Debt.mother";
import * as DebtsHook from "../debts/useDebts";
import { SavingsGoalMother } from "../goals/SavingsGoal.mother";
import * as SavingsGoalsHook from "../goals/useSavingsGoals";
import { MonthlyPlanMother } from "../monthly-plan/MonthlyPlanMother";
import * as MonthlyPlanHook from "../monthly-plan/useMonthlyPlan";
import { TransactionMother } from "../transactions/Transaction.mother";
import { Classification, TransactionType } from "../transactions/transaction";
import * as TransactionsHook from "../transactions/useTransactions";
import { parseIsoDate } from "./isoDate";
import { useDailyBudget } from "./useDailyBudget";

/** Fixed evaluation date so the tests are deterministic. */
const TODAY = parseIsoDate("2026-06-10");

/** Memo: builds a stable "no-op" context shell mirroring the test helpers. */
const ctxShell = () => ({
  past: [] as ReadonlyArray<unknown>,
  future: [] as ReadonlyArray<unknown>,
  undo: vi.fn(),
  redo: vi.fn(),
  canUndo: false,
  canRedo: false,
});

/**
 * Render a small component that calls the hook and exposes the
 * interesting fields as `data-testid` spans. Returning the raw result
 * via the DOM is the simplest way to assert on it (we don't need to
 * dump the entire object; we can target the fields the dashboard
 * cares about).
 */
function TestProbe() {
  const result = useDailyBudget(TODAY);
  if (!result) {
    return (
      <>
        <p data-testid="status">null</p>
        <p data-testid="dailyBudget">null</p>
        <p data-testid="mode">null</p>
        <p data-testid="actions">null</p>
        <p data-testid="daysRemaining">null</p>
        <p data-testid="alerts">null</p>
        <p data-testid="dailyBudgetRaw">null</p>
        <p data-testid="periodEnded">null</p>
      </>
    );
  }
  return (
    <>
      <p data-testid="status">{result.daily.status}</p>
      <p data-testid="dailyBudget">{String(result.daily.dailyBudgetRounded)}</p>
      <p data-testid="dailyBudgetRaw">result.daily.dailyBudgetRaw.toString()</p>
      <p data-testid="spentToday">{String(result.daily.spentToday)}</p>
      <p data-testid="daysRemaining">{String(result.daily.daysRemaining)}</p>
      <p data-testid="periodEnded">{String(result.daily.periodEnded)}</p>
      <p data-testid="forecast">{String(result.daily.forecastRounded)}</p>
      <p data-testid="mode">{result.decision.mode}</p>
      <p data-testid="actions">{String(result.decision.actions.length)}</p>
      <p data-testid="alerts">{String(result.decision.alerts.length)}</p>
    </>
  );
}

describe("useDailyBudget hook", () => {
  beforeEach(() => {
    // Default mocks: a valid plan + settings, empty goals/debts/txs.
    // Tests override the relevant fields.
    const settings = CoachSettingsMother.testSettings();
    vi.spyOn(CoachSettingsHook, "useCoachSettings").mockReturnValue({
      ...ctxShell(),
      settings,
      setSettings: vi.fn(),
    });
    vi.spyOn(MonthlyPlanHook, "useMonthlyPlan").mockReturnValue({
      ...ctxShell(),
      plan: MonthlyPlanMother.testPlan(),
      setPlan: vi.fn(),
    });
    vi.spyOn(TransactionsHook, "useTransactions").mockReturnValue({
      ...ctxShell(),
      transactions: [],
      add: vi.fn(),
      remove: vi.fn(() => false),
      update: vi.fn(),
    });
    vi.spyOn(SavingsGoalsHook, "useSavingsGoals").mockReturnValue({
      ...ctxShell(),
      goals: [],
      add: vi.fn(),
      remove: vi.fn(() => false),
      update: vi.fn(),
    });
    vi.spyOn(DebtsHook, "useDebts").mockReturnValue({
      ...ctxShell(),
      debts: [],
      add: vi.fn(),
      remove: vi.fn(() => false),
      update: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the composed result on the happy path (green status)", () => {
    // Pin the spec scenario: balance=600, mandatory=460, savings=30,
    // days=10  ⇒  dailyBudget=11.00  ⇒  status=green, mode=steady.
    vi.spyOn(MonthlyPlanHook, "useMonthlyPlan").mockReturnValue({
      ...ctxShell(),
      plan: MonthlyPlanMother.testPlan({
        currentBalance: new Big(600),
        mandatoryExpensesRemaining: new Big(460),
        savingsGoalRemaining: new Big(30),
        daysRemaining: 10,
      }),
      setPlan: vi.fn(),
    });

    render(<TestProbe />);

    expect(screen.getByTestId("status")).toHaveTextContent("green");
    expect(screen.getByTestId("dailyBudget")).toHaveTextContent("11");
    expect(screen.getByTestId("daysRemaining")).toHaveTextContent("10");
    expect(screen.getByTestId("periodEnded")).toHaveTextContent("false");
    expect(screen.getByTestId("forecast")).toHaveTextContent("110");
    // No transactions today. The surplus rule fires
    // ("Save 50% of today's surplus") because the user has
    // positive unspent allowance — that's a single action, not zero.
    expect(screen.getByTestId("spentToday")).toHaveTextContent("0");
    expect(screen.getByTestId("actions")).toHaveTextContent("1");
    expect(screen.getByTestId("alerts")).toHaveTextContent("0");
  });

  it("flips to recovery mode when today's spend exceeds the daily budget", () => {
    // Same plan as happy path (daily=11). Add a 20 € avoidable expense
    // for TODAY so spent_today (20) > daily (11) ⇒ recovery mode.
    vi.spyOn(MonthlyPlanHook, "useMonthlyPlan").mockReturnValue({
      ...ctxShell(),
      plan: MonthlyPlanMother.testPlan({
        currentBalance: new Big(600),
        mandatoryExpensesRemaining: new Big(460),
        savingsGoalRemaining: new Big(30),
        daysRemaining: 10,
      }),
      setPlan: vi.fn(),
    });
    vi.spyOn(TransactionsHook, "useTransactions").mockReturnValue({
      ...ctxShell(),
      transactions: [
        TransactionMother.testTransaction({
          id: "tx-today-dining",
          date: TODAY,
          type: TransactionType.Expense,
          category: "dining",
          amount: new Big(20),
          classification: Classification.Avoidable,
          necessary: false,
        }),
      ],
      add: vi.fn(),
      remove: vi.fn(() => false),
      update: vi.fn(),
    });

    render(<TestProbe />);

    expect(screen.getByTestId("status")).toHaveTextContent("green");
    expect(screen.getByTestId("spentToday")).toHaveTextContent("20");
    // Recovery rules emit at least one action (the per-category freeze).
    expect(screen.getByTestId("mode")).toHaveTextContent("recovery");
    expect(screen.getByTestId("actions")).not.toHaveTextContent("0");
  });

  it("returns null when no plan is set (first-run state)", () => {
    vi.spyOn(MonthlyPlanHook, "useMonthlyPlan").mockReturnValue({
      ...ctxShell(),
      plan: undefined,
      setPlan: vi.fn(),
    });
    // Settings must also be set for the hook to compose — but in v1
    // we still return null when plan is undefined regardless of
    // settings, because the spec says "no plan ⇒ dashboard shows
    // EmptyPlanCard".
    vi.spyOn(CoachSettingsHook, "useCoachSettings").mockReturnValue({
      ...ctxShell(),
      settings: undefined,
      setSettings: vi.fn(),
    });

    render(<TestProbe />);

    expect(screen.getByTestId("status")).toHaveTextContent("null");
    expect(screen.getByTestId("dailyBudget")).toHaveTextContent("null");
    expect(screen.getByTestId("mode")).toHaveTextContent("null");
  });

  it("surfaces the engine's red status when the plan is mathematically red", () => {
    // balance=10, mandatory=100, savings=30, days=5  ⇒  raw = -120/5 = -24
    // ⇒ status=red (no division-by-zero; engine is safe).
    vi.spyOn(MonthlyPlanHook, "useMonthlyPlan").mockReturnValue({
      ...ctxShell(),
      plan: MonthlyPlanMother.testPlan({
        currentBalance: new Big(10),
        mandatoryExpensesRemaining: new Big(100),
        savingsGoalRemaining: new Big(30),
        daysRemaining: 5,
      }),
      setPlan: vi.fn(),
    });

    render(<TestProbe />);

    expect(screen.getByTestId("status")).toHaveTextContent("red");
    // Negative daily budget displayed.
    expect(screen.getByTestId("dailyBudget")).toHaveTextContent("-24");
    expect(screen.getByTestId("periodEnded")).toHaveTextContent("false");
  });

  it("includes debts + goals + settings in the derivation (smoke)", () => {
    // Single goal + single debt present. The engine should compose
    // without errors and produce a non-null result. We don't pin the
    // exact numbers here — that's the engine tests' job — we just
    // verify the hook threads the inputs through.
    vi.spyOn(SavingsGoalsHook, "useSavingsGoals").mockReturnValue({
      ...ctxShell(),
      goals: [SavingsGoalMother.vacation()],
      add: vi.fn(),
      remove: vi.fn(() => false),
      update: vi.fn(),
    });
    vi.spyOn(DebtsHook, "useDebts").mockReturnValue({
      ...ctxShell(),
      debts: [DebtMother.creditCard()],
      add: vi.fn(),
      remove: vi.fn(() => false),
      update: vi.fn(),
    });

    render(<TestProbe />);

    // With the default plan (all money zero, 10 days), the engine
    // returns status=red. We just want a non-null payload.
    expect(screen.getByTestId("status")).not.toHaveTextContent("null");
    expect(screen.getByTestId("mode")).not.toHaveTextContent("null");
  });
});
