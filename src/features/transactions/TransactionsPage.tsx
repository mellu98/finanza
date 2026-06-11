/**
 * `TransactionsPage` — the `/transactions` page.
 *
 * Composes:
 *   - the sortable, searchable `TransactionsTable` (T6.5)
 *   - an Import CSV button → a `Modal` with a `<textarea>` for paste
 *     and a `<Form.Control type="file">` for file upload. On submit
 *     the page calls `importCSV` and shows a success / error alert.
 *   - an Export CSV button → triggers a browser download of the
 *     exported CSV via a `Blob` + `URL.createObjectURL` + a synthetic
 *     anchor click.
 *   - a small "Per-category budget" section (PR2 #3 resolution surface)
 *     that lets the user set/update a `categoryBudget` on the most
 *     recent transaction of each category. The budget then flows into
 *     the coach-rules engine's freeze selector (see PR6 carry-forward
 *     refactor).
 *
 * Persistence:
 *   - `add(tx, true)` / `update(tx, true)` push to the undo stack
 *     (matches the Guitos `BudgetContext` contract).
 *   - The CSV import calls `add` once per row with `saveInHistory=true`
 *     so a mistaken import is undoable.
 */
import Big from "big.js";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Download, FileUp, TriangleAlert } from "lucide-react";
import { DEFAULT_CATEGORIES } from "./categories";
import { CSV_HEADER, exportCSV, importCSV } from "./TransactionsCsvService";
import { TransactionsTable } from "./TransactionsTable";
import type { Transaction } from "./transaction";
import { useTransactions } from "./useTransactions";

interface CategoryBudgetForm {
	category: string;
	amount: string;
}

const newCategoryBudgets = (): Map<string, CategoryBudgetForm> => {
	const m = new Map<string, CategoryBudgetForm>();
	for (const c of DEFAULT_CATEGORIES) {
		m.set(c.key, { category: c.key, amount: "" });
	}
	return m;
};

const downloadBlob = (text: string, filename: string): void => {
	const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.style.display = "none";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

const todayStamp = (): string => {
	const d = new Date();
	return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
};

export function TransactionsPage() {
	const { transactions, add, update } = useTransactions();
	const [showImportModal, setShowImportModal] = useState(false);
	const [importText, setImportText] = useState("");
	const [importResult, setImportResult] = useState<{
		kind: "success" | "error" | null;
		message: string;
	}>({ kind: null, message: "" });
	// The per-category budget editor uses uncontrolled inputs; the DOM
	// is the source of truth. `budgetForms` is the seed for the
	// initial Map; the Save button reads the live DOM value.
	const [budgetForms] = useState<Map<string, CategoryBudgetForm>>(
		() => newCategoryBudgets(),
	);

	// Pre-fill the budget form with the most recent transaction's
	// `categoryBudget` (if any) for each category, so the user can
	// see the current state and override it.
	const lastBudgetByCategory = useMemo(() => {
		const map = new Map<string, string>();
		for (const t of transactions) {
			if (t.categoryBudget !== undefined) {
				map.set(t.category, t.categoryBudget.toString());
			}
		}
		return map;
	}, [transactions]);

	const handleImportOpen = () => {
		setImportText("");
		setImportResult({ kind: null, message: "" });
		setShowImportModal(true);
	};

	const handleImportFile = async (
		e: React.ChangeEvent<HTMLInputElement>,
	): Promise<void> => {
		const file = e.target.files?.[0];
		if (!file) return;
		const text = await file.text();
		setImportText(text);
	};

	const handleImportSubmit = () => {
		if (importText.trim() === "") {
			setImportResult({
				kind: "error",
				message: "Incolla un CSV o carica un file prima.",
			});
			return;
		}
		const result = importCSV(importText);
		if (result.errors.length > 0) {
			setImportResult({
				kind: "error",
				message:
					`Importazione rifiutata — ${result.errors.length} riga/righe non valide. ` +
					result.errors
						.slice(0, 5)
						.map((e) => `Riga ${e.row}: ${e.message}`)
						.join("; "),
			});
			return;
		}
		for (const tx of result.ok) {
			add(tx, true);
		}
		setImportResult({
			kind: "success",
			message: `Importate ${result.ok.length} transazione/i.`,
		});
		setImportText("");
		// Close after a short delay so the user sees the success message.
		setTimeout(() => {
			setShowImportModal(false);
			setImportResult({ kind: null, message: "" });
		}, 1200);
	};

	const handleExport = () => {
		const csv = exportCSV(transactions);
		downloadBlob(csv, `daily-coach-transactions-${todayStamp()}.csv`);
	};

	const handleBudgetSave = (category: string, rawAmount?: string) => {
		const form = budgetForms.get(category);
		const value = (rawAmount ?? form?.amount ?? "").trim();
		if (value === "") {
			setImportResult({
				kind: "error",
				message: `Inserisci un importo di budget per ${category}.`,
			});
			return;
		}
		// Find the most recent transaction in this category.
		const candidates = transactions
			.filter((t) => t.category === category)
			.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
		const target = candidates[0];
		let amount: Big;
		try {
			amount = new Big(value);
		} catch {
			setImportResult({
				kind: "error",
				message: `Importo non valido "${value}".`,
			});
			return;
		}
		if (amount.lt(0)) {
			setImportResult({
				kind: "error",
				message: "Il budget deve essere positivo o nullo.",
			});
			return;
		}
		if (target) {
			update({ ...target, categoryBudget: amount }, true);
		} else {
			// No existing transaction in this category: create a tiny
			// placeholder so the engine has a budget to consume.
			const placeholder: Transaction = {
				id: crypto.randomUUID(),
				date: ("2026-01-01" as never) ?? ("" as never),
				type: "expense" as never,
				category,
				description: "(placeholder budget di categoria)",
				amount: new Big(0) as Transaction["amount"],
				necessary: false,
				classification: "controllable" as never,
				categoryBudget: amount,
			};
			add(placeholder, true);
		}
		setImportResult({
			kind: "success",
			message: `Budget per ${category} impostato a ${amount.toString()}.`,
		});
	};

	return (
		<div
			className="space-y-4 py-3"
			data-testid="transactions-page"
			role="region"
			aria-label="Transazioni"
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h1
					className="font-display text-2xl font-semibold tracking-tight"
					data-testid="transactions-page-title"
				>
					Transazioni
				</h1>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleImportOpen}
						data-testid="tx-import-button"
					>
						<FileUp className="size-4" aria-hidden="true" />
						Importa CSV
					</Button>
					<Button
						variant="default"
						size="sm"
						onClick={handleExport}
						data-testid="tx-export-button"
					>
						<Download className="size-4" aria-hidden="true" />
						Esporta CSV
					</Button>
				</div>
			</div>

			{importResult.kind === "success" && (
				<div
					role="status"
					aria-live="polite"
					data-testid="tx-page-success-alert"
					className="flex items-start gap-2 rounded-xl border border-coach-green/40 bg-coach-green/10 px-4 py-3 text-sm text-coach-greenFg"
				>
					<CheckCircle2
						className="mt-0.5 size-4 shrink-0"
						aria-hidden="true"
					/>
					<span>{importResult.message}</span>
				</div>
			)}
			{importResult.kind === "error" && (
				<div
					role="alert"
					data-testid="tx-page-error-alert"
					className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					<TriangleAlert
						className="mt-0.5 size-4 shrink-0"
						aria-hidden="true"
					/>
					<span>{importResult.message}</span>
				</div>
			)}

			<Card data-testid="category-budget-editor" aria-label="Budget per categoria">
				<CardHeader>
					<CardTitle className="font-display text-lg font-semibold">
						Budget per categoria
					</CardTitle>
					<CardDescription>
						Imposta un tetto per categoria. Quando una transazione lo
						supera, il coach congela la categoria.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
						{DEFAULT_CATEGORIES.map((c) => {
							const current = lastBudgetByCategory.get(c.key) ?? "";
							return (
								<div
									className="rounded-xl border border-border/60 p-3"
									data-testid={`budget-row-${c.key}`}
									data-budget-form="true"
									key={c.key}
								>
									<div className="mb-1">
										<Label
											htmlFor={`budget-${c.key}`}
											className="text-sm"
										>
											{c.labelIt}{" "}
											{current && (
												<span className="font-normal text-muted-foreground">
													(corrente: {current})
												</span>
											)}
										</Label>
									</div>
									<Input
										type="number"
										step="0.01"
										min={0}
										id={`budget-${c.key}`}
										name={`budget-${c.key}`}
										// Uncontrolled input: the DOM owns the value.
										// We seed it with the current budget (if any)
										// so the user sees and can edit the active
										// value. Save reads the DOM value via the
										// form reference.
										defaultValue={current}
										onChange={() => {
											// Touched — the save handler will read the
											// live value from the form on submit.
										}}
										data-testid={`budget-amount-input-${c.key}`}
										placeholder="0.00"
									/>
									<div className="mt-2 flex gap-1">
										<Button
											size="sm"
											variant="outline"
											onClick={() => {
												// Pre-fill the input with the current budget
												// so the user can see and edit the active
												// value. Find the input by id and reset.
												const el = document.getElementById(
													`budget-${c.key}`,
												) as HTMLInputElement | null;
												if (el) el.value = current;
											}}
											data-testid={`budget-edit-${c.key}`}
										>
											Imposta
										</Button>
										<Button
											size="sm"
											variant="default"
											onClick={() => {
												// Read the live DOM value at click time so
												// the user's last keystroke is respected
												// (avoids stale-state issues with the
												// uncontrolled input).
												const el = document.getElementById(
													`budget-${c.key}`,
												) as HTMLInputElement | null;
												const value = el?.value ?? "";
												handleBudgetSave(c.key, value);
											}}
											data-testid={`budget-save-${c.key}`}
										>
											Salva
										</Button>
									</div>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>

			{transactions.length === 0 ? (
				<Card data-testid="transactions-empty-state" className="p-6 text-center">
					<CardContent className="space-y-1 p-0">
						<p className="font-medium">Nessuna transazione.</p>
						<p className="text-sm text-muted-foreground">
							Tocca "Importa CSV" per caricarne un blocco, oppure
							aggiungine una dal Mentore/Simulatore.
						</p>
					</CardContent>
				</Card>
			) : (
				<TransactionsTable transactions={transactions} />
			)}

			<Dialog
				open={showImportModal}
				onOpenChange={(open) => {
					if (!open) setShowImportModal(false);
				}}
			>
				<DialogContent
					className="max-w-2xl"
					data-testid="tx-import-modal"
					aria-labelledby="tx-import-modal-title"
				>
					<DialogHeader>
						<DialogTitle id="tx-import-modal-title">
							Importa CSV
						</DialogTitle>
						<DialogDescription>
							Carica un file o incolla il contenuto CSV qui sotto.
						</DialogDescription>
					</DialogHeader>
					{importResult.kind === "success" && (
						<div
							role="status"
							aria-live="polite"
							data-testid="tx-import-success-alert"
							className="flex items-start gap-2 rounded-xl border border-coach-green/40 bg-coach-green/10 px-4 py-3 text-sm text-coach-greenFg"
						>
							<CheckCircle2
								className="mt-0.5 size-4 shrink-0"
								aria-hidden="true"
							/>
							<span>{importResult.message}</span>
						</div>
					)}
					{importResult.kind === "error" && (
						<div
							role="alert"
							data-testid="tx-import-error-alert"
							className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
						>
							<TriangleAlert
								className="mt-0.5 size-4 shrink-0"
								aria-hidden="true"
							/>
							<span>{importResult.message}</span>
						</div>
					)}
					<div className="space-y-2">
						<p className="text-xs text-muted-foreground">
							Intestazione attesa:{" "}
							<code
								className="rounded bg-muted px-1 py-0.5 font-mono"
								data-testid="tx-import-expected-header"
							>
								{CSV_HEADER}
							</code>
						</p>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="tx-import-file">Carica un file CSV</Label>
						<Input
							id="tx-import-file"
							type="file"
							accept=".csv,text/csv"
							onChange={handleImportFile}
							data-testid="tx-import-file"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="tx-import-textarea">
							…oppure incolla il testo CSV
						</Label>
						<Textarea
							id="tx-import-textarea"
							rows={10}
							value={importText}
							onChange={(e) => setImportText(e.target.value)}
							data-testid="tx-import-textarea"
							placeholder={`${CSV_HEADER}\n2026-06-10,expense,groceries,milk,3.50,cash,true,controllable,`}
						/>
					</div>
					<DialogFooter className="gap-2">
						<Button
							variant="secondary"
							onClick={() => setShowImportModal(false)}
							data-testid="tx-import-cancel"
						>
							Annulla
						</Button>
						<Button
							variant="default"
							onClick={handleImportSubmit}
							data-testid="tx-import-submit"
						>
							Importa
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
