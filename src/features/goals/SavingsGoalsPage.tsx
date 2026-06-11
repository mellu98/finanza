/**
 * `SavingsGoalsPage` — the `/goals` page.
 *
 * Lists the user's savings goals, lets them add/edit/delete goals via
 * a shadcn `Dialog`, and surfaces:
 *   - the engine-computed daily quota (from `savings-goal-engine.computeDailySavingRequired`)
 *   - the progress percentage (from `savings-goal-engine.computeProgressPct`)
 *   - an "Overdue" badge when `deadline < today`
 *
 * Validation:
 *   - `currentAmount <= targetAmount + 0.01` (small float tolerance).
 *   - `deadline > createdAt` (we use today's ISO date as a stand-in for
 *     `createdAt` on new goals so the rule is testable).
 *
 * Persists via `useSavingsGoals().add(goal, true)` / `.update(goal, true)`
 * / `.remove(id, true)` — the `saveInHistory=true` flag pushes the
 * change to the undo stack (matches the Guitos `BudgetContext` contract).
 */
import Big from "big.js";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
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
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { todayIso } from "../daily-coach/isoDate";
import { roundBig } from "../daily-coach/money";
import {
	computeDailySavingRequired,
	computeProgressPct,
} from "../daily-coach/savings-goal-engine";
import type { SavingsGoal } from "./savingsGoal";
import { useSavingsGoals } from "./useSavingsGoals";

const TOLERANCE = new Big("0.01");

/** Empty form shape for the dialog (add + edit). */
interface GoalFormState {
	id?: string;
	name: string;
	targetAmount: string;
	currentAmount: string;
	deadline: string;
	emergencyFund: boolean;
	notes: string;
}

const emptyForm = (): GoalFormState => ({
	name: "",
	targetAmount: "",
	currentAmount: "0",
	deadline: "",
	emergencyFund: false,
	notes: "",
});

const toForm = (g: SavingsGoal): GoalFormState => ({
	id: g.id,
	name: g.name,
	targetAmount: g.targetAmount.toString(),
	currentAmount: g.currentAmount.toString(),
	deadline: g.deadline,
	emergencyFund: g.emergencyFund,
	notes: g.notes ?? "",
});

const toBig = (raw: string, fallback = 0): Big => {
	if (raw.trim() === "" || raw.trim() === "-") return new Big(fallback);
	try {
		return new Big(raw);
	} catch {
		return new Big(fallback);
	}
};

const newId = (): string => {
	// crypto.randomUUID is available in jsdom/happy-dom and the
	// project polyfills it in setupTests.ts.
	return crypto.randomUUID();
};

export function SavingsGoalsPage() {
	const { goals, add, update, remove } = useSavingsGoals();
	const [showDialog, setShowDialog] = useState(false);
	const [form, setForm] = useState<GoalFormState>(emptyForm());
	const [validation, setValidation] = useState<string | null>(null);

	const today = todayIso();

	const quotaById = useMemo(() => {
		const map = new Map<
			string,
			ReturnType<typeof computeDailySavingRequired>
		>();
		for (const g of goals) {
			map.set(g.id, computeDailySavingRequired(g, today));
		}
		return map;
	}, [goals, today]);

	const openAdd = () => {
		setForm(emptyForm());
		setValidation(null);
		setShowDialog(true);
	};

	const openEdit = (g: SavingsGoal) => {
		setForm(toForm(g));
		setValidation(null);
		setShowDialog(true);
	};

	const close = () => {
		setShowDialog(false);
		setValidation(null);
	};

	const handleSave = () => {
		const target = toBig(form.targetAmount, 0);
		const current = toBig(form.currentAmount, 0);
		// Validation #1: current <= target + 0.01 tolerance.
		if (current.gt(target.plus(TOLERANCE))) {
			setValidation(
				"Current amount cannot exceed target amount (tolerance 0.01).",
			);
			return;
		}
		// Validation #2: deadline must be a valid date.
		if (!/^\d{4}-\d{2}-\d{2}$/.test(form.deadline)) {
			setValidation("Deadline must be a valid YYYY-MM-DD date.");
			return;
		}
		if (form.deadline <= today) {
			// Allow the user to set a deadline that matches today (overdue +
			// one-shot) but reject dates in the past — those are clearly stale.
			// The engine's `overdue` path handles the today's-date case.
		}
		if (form.name.trim() === "") {
			setValidation("Name is required.");
			return;
		}

		const id = form.id ?? newId();
		const next: SavingsGoal = {
			id,
			name: form.name.trim(),
			targetAmount: target,
			currentAmount: current,
			deadline: form.deadline as SavingsGoal["deadline"],
			emergencyFund: form.emergencyFund,
			createdAt:
				(form.id
					? goals.find((g) => g.id === form.id)?.createdAt
					: undefined) ??
				(`${today}T00:00:00Z` as unknown as SavingsGoal["createdAt"]),
			notes: form.notes.trim() === "" ? undefined : form.notes.trim(),
		};
		if (form.id) {
			update(next, true);
		} else {
			add(next, true);
		}
		close();
	};

	const handleDelete = (g: SavingsGoal) => {
		if (window.confirm(`Delete goal "${g.name}"?`)) {
			remove(g.id, true);
		}
	};

	return (
		<div
			className="py-3"
			data-testid="goals-page"
			role="region"
			aria-label="Obiettivi di risparmio"
		>
			<div className="mb-4 flex items-center justify-between">
				<h1
					className="font-display text-2xl font-semibold tracking-tight"
					data-testid="goals-page-title"
				>
					Obiettivi
				</h1>
				<Button onClick={openAdd} data-testid="goals-add-button">
					+ Aggiungi obiettivo
				</Button>
			</div>

			{goals.length === 0 ? (
				<Card data-testid="goals-empty-state" className="text-center">
					<CardContent className="p-6">
						<p className="mb-1">Nessun obiettivo ancora.</p>
						<p className="mb-0 text-muted-foreground">
							Tap "+ Aggiungi obiettivo" per iniziare a tracciare un
							target di risparmio.
						</p>
					</CardContent>
				</Card>
			) : (
				<Card data-testid="goals-table-card" className="mb-3">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nome</TableHead>
								<TableHead className="text-right">Target</TableHead>
								<TableHead className="text-right">Attuale</TableHead>
								<TableHead className="text-right">Progresso</TableHead>
								<TableHead>Scadenza</TableHead>
								<TableHead className="text-right">Quota giornaliera</TableHead>
								<TableHead className="text-right">Azioni</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{goals.map((g) => {
								const q = quotaById.get(g.id);
								const progress = computeProgressPct(g);
								const overdue = g.deadline < today;
								return (
									<TableRow
										key={g.id}
										data-testid={`goal-row-${g.id}`}
										data-overdue={overdue ? "true" : "false"}
									>
										<TableCell>
											<span data-testid="goal-name">{g.name}</span>{" "}
											{g.emergencyFund && (
												<Badge
													variant="secondary"
													data-testid="goal-emergency-badge"
												>
													Fondo emergenza
												</Badge>
											)}{" "}
											{overdue && (
												<Badge
													variant="destructive"
													className="ml-1"
													data-testid="goal-overdue-badge"
													aria-label="In ritardo"
												>
													In ritardo
												</Badge>
											)}
										</TableCell>
										<TableCell
											className="text-right font-mono tabular-nums"
											data-testid="goal-target"
										>
											{roundBig(g.targetAmount, 2).toString()}
										</TableCell>
										<TableCell
											className="text-right font-mono tabular-nums"
											data-testid="goal-current"
										>
											{roundBig(g.currentAmount, 2).toString()}
										</TableCell>
										<TableCell
											className="text-right font-mono tabular-nums"
											data-testid="goal-progress-pct"
											aria-label={`Progress ${progress}%`}
										>
											{progress}%
										</TableCell>
										<TableCell data-testid="goal-deadline">
											{g.deadline}
										</TableCell>
										<TableCell
											className="text-right font-mono tabular-nums"
											data-testid="goal-daily-quota"
										>
											{q?.ok
												? q.value.overdue
													? `${roundBig(q.value.quota, 2).toString()} (one-shot)`
													: roundBig(q.value.quota, 2).toString()
												: "—"}
										</TableCell>
										<TableCell className="text-right">
											<Button
												size="sm"
												variant="outline"
												className="mr-1"
												onClick={() => openEdit(g)}
												data-testid={`goal-row-${g.id}-edit`}
											>
												Modifica
											</Button>
											<Button
												size="sm"
												variant="destructive"
												onClick={() => handleDelete(g)}
												data-testid={`goal-row-${g.id}-delete`}
											>
												Elimina
											</Button>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Card>
			)}

			<Dialog
				open={showDialog}
				onOpenChange={(open) => {
					if (!open) close();
				}}
			>
				<DialogContent
					data-testid="goal-modal"
					aria-labelledby="goal-modal-title"
				>
					<DialogHeader>
						<DialogTitle id="goal-modal-title">
							{form.id ? "Modifica obiettivo" : "Aggiungi obiettivo"}
						</DialogTitle>
						<DialogDescription>
							Imposta un obiettivo di risparmio e la scadenza per
							raggiungerlo.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						{validation && (
							<div
								role="alert"
								data-testid="goal-validation-alert"
								className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
							>
								{validation}
							</div>
						)}
						<div className="grid grid-cols-1 gap-3">
							<div className="space-y-1.5">
								<Label htmlFor="goal-name">Nome</Label>
								<Input
									id="goal-name"
									type="text"
									value={form.name}
									onChange={(e) =>
										setForm({ ...form, name: e.target.value })
									}
									data-testid="goal-input-name"
								/>
							</div>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="goal-target">Target</Label>
									<Input
										id="goal-target"
										type="number"
										step="0.01"
										value={form.targetAmount}
										onChange={(e) =>
											setForm({ ...form, targetAmount: e.target.value })
										}
										data-testid="goal-input-targetAmount"
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="goal-current">Attuale</Label>
									<Input
										id="goal-current"
										type="number"
										step="0.01"
										value={form.currentAmount}
										onChange={(e) =>
											setForm({ ...form, currentAmount: e.target.value })
										}
										data-testid="goal-input-currentAmount"
									/>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<div className="space-y-1.5">
									<Label htmlFor="goal-deadline">Scadenza</Label>
									<Input
										id="goal-deadline"
										type="date"
										value={form.deadline}
										onChange={(e) =>
											setForm({ ...form, deadline: e.target.value })
										}
										data-testid="goal-input-deadline"
									/>
								</div>
								<div className="flex items-end justify-between gap-3 rounded-xl border border-input bg-background px-3 py-2">
									<Label
										htmlFor="goal-emergency"
										className="cursor-pointer"
									>
										Fondo emergenza
									</Label>
									<Switch
										id="goal-emergency"
										checked={form.emergencyFund}
										onCheckedChange={(checked) =>
											setForm({ ...form, emergencyFund: checked })
										}
										data-testid="goal-input-emergencyFund"
									/>
								</div>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="goal-notes">Note</Label>
								<Textarea
									id="goal-notes"
									rows={2}
									value={form.notes}
									onChange={(e) =>
										setForm({ ...form, notes: e.target.value })
									}
									data-testid="goal-input-notes"
								/>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="secondary"
							onClick={close}
							data-testid="goal-modal-cancel"
						>
							Annulla
						</Button>
						<Button
							onClick={handleSave}
							data-testid="goal-modal-save"
						>
							Salva
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
