/**
 * `TransactionsTable` — the Excel-style sortable, searchable view of
 * the user's `Transaction[]`.
 *
 * Per the spec:
 *   - Sortable headers with `aria-sort` reflecting the current state
 *     (`"ascending"` / `"descending"` / `"none"`).
 *   - Search box filters by `description` AND `notes` (case-insensitive).
 *   - Sort supports: date asc/desc, amount asc/desc, category asc.
 *   - Each row has a `data-testid` (e.g. `tx-row-<id>`) and a visible
 *     accessible name (the description).
 *
 * The component is pure (no `useState` lifted into App; only its own
 * sort/search state) and does not touch the repository — `TransactionsPage`
 * (T6.6) wires the user's data through.
 */
import { useMemo, useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { Transaction } from "./transaction";

type SortKey = "date" | "amount" | "category";
type SortDir = "ascending" | "descending" | "none";

interface SortState {
	key: SortKey | null;
	dir: SortDir;
}

const sortBy = (
	txs: ReadonlyArray<Transaction>,
	key: SortKey,
	dir: SortDir,
): ReadonlyArray<Transaction> => {
	if (dir === "none") return txs;
	const mul = dir === "ascending" ? 1 : -1;
	return [...txs].sort((a, b) => {
		if (key === "amount") {
			return mul * a.amount.minus(b.amount).toNumber();
		}
		const av = String(a[key]);
		const bv = String(b[key]);
		if (av < bv) return -1 * mul;
		if (av > bv) return 1 * mul;
		return 0;
	});
};

const toFixed2 = (n: { toNumber: () => number }): string =>
	n.toNumber().toFixed(2);

export interface TransactionsTableProps {
	transactions: ReadonlyArray<Transaction>;
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
	const [sort, setSort] = useState<SortState>({ key: null, dir: "none" });
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (q === "") return transactions;
		return transactions.filter(
			(t) =>
				t.description.toLowerCase().includes(q) ||
				(t.notes ?? "").toLowerCase().includes(q),
		);
	}, [transactions, search]);

	const sorted = useMemo(() => {
		if (sort.key === null || sort.dir === "none") return filtered;
		return sortBy(filtered, sort.key, sort.dir);
	}, [filtered, sort]);

	const onHeaderClick = (key: SortKey) => {
		setSort((prev) => {
			if (prev.key !== key) {
				return { key, dir: "ascending" };
			}
			if (prev.dir === "ascending") return { key, dir: "descending" };
			if (prev.dir === "descending") return { key: null, dir: "none" };
			return { key, dir: "ascending" };
		});
	};

	const ariaSortFor = (key: SortKey): SortDir =>
		sort.key === key ? sort.dir : "none";

	const sortIndicator = (key: SortKey): string => {
		if (sort.key !== key) return "";
		if (sort.dir === "ascending") return " ▲";
		if (sort.dir === "descending") return " ▼";
		return "";
	};

	return (
		<div data-testid="transactions-table-wrapper">
			<div className="flex flex-wrap items-center justify-between gap-3 mb-3">
				<Input
					type="search"
					placeholder="Cerca descrizione o note"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					aria-label="Cerca transazioni"
					data-testid="tx-search"
					className="w-auto min-w-[16rem] max-w-sm"
				/>
				<span
					className="text-sm text-muted-foreground font-mono tabular-nums"
					data-testid="tx-count"
				>
					{sorted.length} di {transactions.length}
				</span>
			</div>
			{sorted.length === 0 ? (
				<div
					className="py-8 text-center text-muted-foreground"
					data-testid="tx-empty-state"
				>
					Nessuna transazione corrispondente.
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead
								scope="col"
								aria-sort={ariaSortFor("date")}
								onClick={() => onHeaderClick("date")}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onHeaderClick("date");
									}
								}}
								tabIndex={0}
								className="cursor-pointer select-none"
								data-testid="tx-header-date"
							>
								Data{sortIndicator("date")}
							</TableHead>
							<TableHead
								scope="col"
								aria-sort={ariaSortFor("amount")}
								onClick={() => onHeaderClick("amount")}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onHeaderClick("amount");
									}
								}}
								tabIndex={0}
								className="cursor-pointer select-none text-right"
								data-testid="tx-header-amount"
							>
								Importo{sortIndicator("amount")}
							</TableHead>
							<TableHead
								scope="col"
								aria-sort={ariaSortFor("category")}
								onClick={() => onHeaderClick("category")}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onHeaderClick("category");
									}
								}}
								tabIndex={0}
								className="cursor-pointer select-none"
								data-testid="tx-header-category"
							>
								Categoria{sortIndicator("category")}
							</TableHead>
							<TableHead scope="col">Descrizione</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sorted.map((t) => (
							<TableRow
								key={t.id}
								data-testid={`tx-row-${t.id}`}
								aria-label={t.description}
							>
								<TableCell
									className="font-mono tabular-nums"
									data-testid="tx-cell-date"
								>
									{t.date}
								</TableCell>
								<TableCell
									className="font-mono tabular-nums text-right"
									data-testid="tx-cell-amount"
									data-amount={t.amount.toString()}
								>
									{toFixed2(t.amount)}
								</TableCell>
								<TableCell data-testid="tx-cell-category">
									{t.category}
								</TableCell>
								<TableCell data-testid="tx-cell-description">
									{t.description}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
