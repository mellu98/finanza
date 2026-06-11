/**
 * Repository contract for `Transaction[]` persistence.
 *
 * The transaction list is a flat collection — no active pointer, no
 * revisions. The repository stores the entire list under a single
 * key and supports append / remove / replace operations.
 */
import type { Transaction } from "./transaction";

export interface TransactionRepository {
  /** All persisted transactions, or `[]` when none. */
  getAll(): Promise<ReadonlyArray<Transaction>>;

  /**
   * Replace the entire list. Useful for "load defaults" and
   * import-from-backup flows; for normal editing use `add` / `remove`.
   */
  saveAll(transactions: ReadonlyArray<Transaction>): Promise<void>;

  /**
   * Append a transaction. If a transaction with the same id already
   * exists, it is updated in place (idempotent upsert).
   */
  add(transaction: Transaction): Promise<void>;

  /**
   * Remove the transaction with the given id. Returns `true` when a
   * transaction was removed, `false` when no such id existed.
   */
  remove(id: string): Promise<boolean>;
}
