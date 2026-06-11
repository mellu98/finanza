/**
 * Default category catalog for the Daily Financial Coach.
 *
 * The 13 entries cover housing, utilities, health, transport, debt,
 * groceries, dining, subscriptions, shopping, extras, and income.
 * The expense-classifier looks up a transaction's category in this
 * catalog first; caller-supplied custom categories override it.
 *
 * Relocated from `src/features/daily-coach/domain.ts` in PR3
 * (carry-forward of PR2 deviation #6).
 */
import type { Classification } from "./transaction";

export interface CategoryDef {
  /** Stable key used in `Transaction.category`. */
  readonly key: string;
  /** Italian label for the UI. */
  readonly labelIt: string;
  /** English label for the UI / docs. */
  readonly labelEn: string;
  /** Engine-side classification. */
  readonly classification: Classification;
  /** Whether this category is generally necessary. */
  readonly necessary: boolean;
}

/**
 * Default category catalog. Used by `expense-classifier` when no
 * caller-supplied override is provided. The 13 entries cover housing,
 * utilities, health, transport, debt, groceries, dining, subscriptions,
 * shopping, extras, and income.
 */
export const DEFAULT_CATEGORIES: ReadonlyArray<CategoryDef> = [
  {
    key: "housing",
    labelIt: "Casa / Affitto",
    labelEn: "Housing / Rent",
    classification: "essential",
    necessary: true,
  },
  {
    key: "utilities",
    labelIt: "Bollette",
    labelEn: "Utilities",
    classification: "essential",
    necessary: true,
  },
  {
    key: "health",
    labelIt: "Salute",
    labelEn: "Health",
    classification: "essential",
    necessary: true,
  },
  {
    key: "commute_work",
    labelIt: "Benzina per lavoro",
    labelEn: "Work commute",
    classification: "essential",
    necessary: true,
  },
  {
    key: "debt_urgent",
    labelIt: "Debiti / Rate",
    labelEn: "Urgent debt",
    classification: "essential",
    necessary: true,
  },
  {
    key: "groceries",
    labelIt: "Alimentari",
    labelEn: "Groceries",
    classification: "controllable",
    necessary: true,
  },
  {
    key: "commute",
    labelIt: "Benzina generica",
    labelEn: "Generic commute",
    classification: "controllable",
    necessary: false,
  },
  {
    key: "home_variable",
    labelIt: "Spese casa variabili",
    labelEn: "Variable home",
    classification: "controllable",
    necessary: false,
  },
  {
    key: "dining",
    labelIt: "Bar / Ristoranti",
    labelEn: "Dining",
    classification: "avoidable",
    necessary: false,
  },
  {
    key: "subscriptions",
    labelIt: "Abbonamenti",
    labelEn: "Subscriptions",
    classification: "avoidable",
    necessary: false,
  },
  {
    key: "shopping",
    labelIt: "Shopping",
    labelEn: "Shopping",
    classification: "avoidable",
    necessary: false,
  },
  {
    key: "extra",
    labelIt: "Extra",
    labelEn: "Extra",
    classification: "avoidable",
    necessary: false,
  },
  {
    key: "income",
    labelIt: "Entrate",
    labelEn: "Income",
    classification: "controllable",
    necessary: true,
  },
];
