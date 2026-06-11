/**
 * Expense classifier — given a transaction's category key, return its
 * classification and a `necessary` boolean.
 *
 * Looks up the category in `DEFAULT_CATEGORIES` first; if a custom
 * category with the same key is provided by the caller (from
 * `TransactionsContext.customCategories`), the custom definition wins.
 * Unknown categories return a typed `unknown-category` error so the
 * caller can prompt the user to classify them.
 */
import {
  type CategoryDef,
  type Classification,
  DEFAULT_CATEGORIES,
} from "./domain";
import {
  EngineError,
  type EngineErrorDetail,
  engineErr,
  ok,
  type Result,
} from "./engineErrors";

/** Public list of category keys shipped in the default catalog. */
export const DEFAULT_CATEGORY_KEYS: ReadonlyArray<string> =
  DEFAULT_CATEGORIES.map((c) => c.key);

/** Shape returned by the classifier on the `ok` arm. */
export interface ClassificationResult {
  classification: Classification;
  necessary: boolean;
}

/**
 * Look up a category in the default catalog.
 * Returns `undefined` when the category is not in the catalog.
 */
export const lookupCategory = (key: string): CategoryDef | undefined =>
  DEFAULT_CATEGORIES.find((c) => c.key === key);

/**
 * Classify a category. The custom list (if provided) is searched first;
 * the default catalog is the fallback.
 *
 * Returns a `Result<ClassificationResult, EngineErrorDetail>`. On
 * unknown category the error code is `EngineError.UnknownCategory`.
 */
export const classify = (
  category: string,
  customCategories?: ReadonlyArray<
    Pick<CategoryDef, "key" | "classification" | "necessary">
  >,
): Result<ClassificationResult, EngineErrorDetail> => {
  if (customCategories) {
    const custom = customCategories.find((c) => c.key === category);
    if (custom) {
      return ok({
        classification: custom.classification,
        necessary: custom.necessary,
      });
    }
  }

  const def = lookupCategory(category);
  if (def) {
    return ok({
      classification: def.classification,
      necessary: def.necessary,
    });
  }

  return engineErr(
    EngineError.UnknownCategory,
    `unknown category: "${category}"`,
    { category },
  );
};
