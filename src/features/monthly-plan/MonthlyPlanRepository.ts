/**
 * Repository contract for `MonthlyPlan` persistence.
 *
 * One repository per bounded context. The active plan is the one the
 * UI should display by default; calling `setActive(id)` switches it.
 * The first `save()` call after a fresh install also becomes the
 * active plan.
 */
import type { MonthlyPlan } from "./monthlyPlan";

export interface MonthlyPlanRepository {
  /**
   * Persist a plan by id. Overwrites any existing plan with the same
   * id. The first plan saved into an empty store becomes the active
   * plan automatically.
   */
  save(plan: MonthlyPlan): Promise<void>;

  /**
   * The currently active plan, or `undefined` if no plan has ever
   * been saved.
   */
  getActive(): Promise<MonthlyPlan | undefined>;

  /**
   * Switch the active plan to the one with the given id. Throws when
   * no plan with that id exists in the store.
   */
  setActive(id: string): Promise<void>;

  /** All persisted plans. */
  getAll(): Promise<ReadonlyArray<MonthlyPlan>>;

  /** Retrieve a plan by id, or `undefined` if not present. */
  get(id: string): Promise<MonthlyPlan | undefined>;

  /** Remove a plan by id. Returns `true` if the plan was present. */
  delete(id: string): Promise<boolean>;
}
