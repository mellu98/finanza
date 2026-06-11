/**
 * `DebtsPage` — the `/debts` page.
 *
 * Lists the user's debts, lets them add/edit/delete debts via a
 * shadcn `Dialog`, sorts by priority (1..5, highest priority first)
 * then by next due date, and surfaces:
 *   - an "Overdue" badge + `--coach-red` background tint when
 *     `nextDue < today`
 *   - a "HIGH RISK" badge when `remaining > 0.5 * total` AND
 *     `priority >= 4`
 *
 * Persists via `useDebts().add(debt, true)` / `.update(debt, true)` /
 * `.remove(id, true)` — the `saveInHistory=true` flag pushes the
 * change to the undo stack (matches the Guitos `BudgetContext`
 * contract).
 *
 * The sort uses the `sortDebts` helper from the debts engine so the
 * ordering matches what the coach-rules engine and dashboard use.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import Big from "big.js";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { sortDebts } from "../daily-coach/debts-engine";
import { todayIso } from "../daily-coach/isoDate";
import { roundBig } from "../daily-coach/money";
import type { Debt, DebtPriority } from "./debt";
import { DebtPriority as DebtPriorityConst } from "./debt";
import { useDebts } from "./useDebts";

/** Half threshold above which a debt is "high risk" given the user's
 * remaining > 50% of the original total. */
const HIGH_RISK_REMAINING_RATIO = new Big("0.5");
/** Minimum priority (1..5) for a debt to be flagged as "high risk". */
const HIGH_RISK_PRIORITY_MIN = 4;

interface DebtFormState {
  id?: string;
  creditor: string;
  totalAmount: string;
  remainingAmount: string;
  monthlyInstallment: string;
  nextDueDate: string;
  priority: string;
  riskIfUnpaid: string;
  notes: string;
}

const emptyForm = (): DebtFormState => ({
  creditor: "",
  totalAmount: "",
  remainingAmount: "0",
  monthlyInstallment: "0",
  nextDueDate: "",
  priority: "3",
  riskIfUnpaid: "",
  notes: "",
});

const toForm = (d: Debt): DebtFormState => ({
  id: d.id,
  creditor: d.creditor,
  totalAmount: d.totalAmount.toString(),
  remainingAmount: d.remainingAmount.toString(),
  monthlyInstallment: d.monthlyInstallment.toString(),
  nextDueDate: d.nextDueDate,
  priority: String(d.priority),
  riskIfUnpaid: d.riskIfUnpaid ?? "",
  notes: d.notes ?? "",
});

const toBig = (raw: string, fallback = 0): Big => {
  if (raw.trim() === "" || raw.trim() === "-") return new Big(fallback);
  try {
    return new Big(raw);
  } catch {
    return new Big(fallback);
  }
};

const newId = (): string => crypto.randomUUID();

const isHighRisk = (d: Debt): boolean => {
  if (d.priority < HIGH_RISK_PRIORITY_MIN) return false;
  // remaining > 0.5 * total  (strict — equality does NOT trigger).
  const threshold = d.totalAmount.times(HIGH_RISK_REMAINING_RATIO);
  return d.remainingAmount.gt(threshold);
};

const PRIORITY_OPTIONS: ReadonlyArray<{ value: DebtPriority; label: string }> =
  [
    { value: DebtPriorityConst.Priority1, label: "1 — Massima" },
    { value: DebtPriorityConst.Priority2, label: "2 — Alta" },
    { value: DebtPriorityConst.Priority3, label: "3 — Media" },
    { value: DebtPriorityConst.Priority4, label: "4 — Bassa" },
    { value: DebtPriorityConst.Priority5, label: "5 — Minima" },
  ];

export function DebtsPage() {
  const { debts, add, update, remove } = useDebts();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<DebtFormState>(emptyForm());
  const [validation, setValidation] = useState<string | null>(null);
  // Debito in attesa di conferma delete. Sostituisce window.confirm
  // con un Dialog shadcn accessibile.
  const [confirmingDelete, setConfirmingDelete] = useState<Debt | null>(null);

  const titleId = useId();
  const descriptionId = useId();

  const today = todayIso();

  const sorted = useMemo(() => sortDebts(debts), [debts]);

  const openAdd = () => {
    setForm(emptyForm());
    setValidation(null);
    setShowModal(true);
  };

  const openEdit = (d: Debt) => {
    setForm(toForm(d));
    setValidation(null);
    setShowModal(true);
  };

  const close = () => {
    setShowModal(false);
    setValidation(null);
  };

  const handleSave = () => {
    if (form.creditor.trim() === "") {
      setValidation("Il creditore è obbligatorio.");
      return;
    }
    const total = toBig(form.totalAmount, 0);
    const remaining = toBig(form.remainingAmount, 0);
    const installment = toBig(form.monthlyInstallment, 0);
    const priorityNum = Number.parseInt(form.priority, 10);
    if (!Number.isInteger(priorityNum) || priorityNum < 1 || priorityNum > 5) {
      setValidation("La priorità deve essere un numero intero tra 1 e 5.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.nextDueDate)) {
      setValidation("La prossima scadenza deve essere una data valida in formato YYYY-MM-DD.");
      return;
    }
    if (remaining.gt(total)) {
      setValidation("Il residuo non può superare il totale.");
      return;
    }

    const id = form.id ?? newId();
    const next: Debt = {
      id,
      creditor: form.creditor.trim(),
      totalAmount: total,
      remainingAmount: remaining,
      monthlyInstallment: installment,
      nextDueDate: form.nextDueDate as Debt["nextDueDate"],
      priority: priorityNum as DebtPriority,
      riskIfUnpaid:
        form.riskIfUnpaid.trim() === "" ? undefined : form.riskIfUnpaid.trim(),
      notes: form.notes.trim() === "" ? undefined : form.notes.trim(),
    };
    if (form.id) {
      update(next, true);
    } else {
      add(next, true);
    }
    close();
  };

  const handleDelete = (d: Debt) => {
    // Apri Dialog shadcn invece di window.confirm (accessibile + stilizzato)
    setConfirmingDelete(d);
  };
  const confirmDelete = () => {
    if (confirmingDelete) {
      remove(confirmingDelete.id, true);
      setConfirmingDelete(null);
    }
  };

  return (
    <div
      className="space-y-4 py-3"
      data-testid="debts-page"
      role="region"
      aria-label="Debiti"
    >
      <div className="flex items-center justify-between">
        <h1
          className="font-display text-2xl font-semibold tracking-tight"
          data-testid="debts-page-title"
        >
          Debiti
        </h1>
        <Button
          onClick={openAdd}
          data-testid="debts-add-button"
          aria-label="Aggiungi debito"
        >
          <Plus aria-hidden="true" />
          Aggiungi debito
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card
          data-testid="debts-empty-state"
          className="text-center"
          aria-label="Nessun debito tracciato"
        >
          <CardContent className="space-y-1 p-6">
            <p className="font-medium">Nessun debito tracciato.</p>
            <p className="text-sm text-muted-foreground">
              Tocca "Aggiungi debito" per iniziare a tracciare un creditore, un
              saldo e la prossima scadenza.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="debts-table-card">
          <CardHeader className="p-4 pb-3 sm:p-5 sm:pb-4">
            <CardTitle className="font-display text-base font-semibold">
              I tuoi debiti
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* overflow-x-auto: la tabella ha 7 colonne e su mobile (xs)
               può essere più larga del viewport. Senza scroll orizzontale
               la tabella viene tagliata o overflowa in modo brutto. */}
            <div className="overflow-x-auto scrollbar-thin">
              <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Creditore</TableHead>
                  <TableHead className="text-right">Totale</TableHead>
                  <TableHead className="text-right">Residuo</TableHead>
                  <TableHead className="text-right">Rata</TableHead>
                  <TableHead>Scadenza</TableHead>
                  <TableHead className="text-right">Priorità</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((d) => {
                  const overdue = d.nextDueDate < today;
                  const highRisk = isHighRisk(d);
                  return (
                    <TableRow
                      key={d.id}
                      data-testid={`debt-row-${d.id}`}
                      data-overdue={overdue ? "true" : "false"}
                      data-high-risk={highRisk ? "true" : "false"}
                      className={
                        overdue
                          ? "bg-coach-red text-coach-red-fg hover:bg-coach-red/90"
                          : undefined
                      }
                    >
                      <TableCell>
                        <span data-testid="debt-creditor">{d.creditor}</span>{" "}
                        {overdue && (
                          <Badge
                            variant="destructive"
                            className="ml-1"
                            data-testid="debt-overdue-badge"
                            aria-label="Scaduto"
                          >
                            Scaduto
                          </Badge>
                        )}{" "}
                        {highRisk && (
                          <Badge
                            variant="yellow"
                            className="ml-1"
                            data-testid="debt-high-risk-badge"
                            aria-label="Alto rischio"
                          >
                            ALTO RISCHIO
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-right font-mono tabular-nums"
                        data-testid="debt-total"
                      >
                        {roundBig(d.totalAmount, 2).toString()}
                      </TableCell>
                      <TableCell
                        className="text-right font-mono tabular-nums"
                        data-testid="debt-remaining"
                      >
                        {roundBig(d.remainingAmount, 2).toString()}
                      </TableCell>
                      <TableCell
                        className="text-right font-mono tabular-nums"
                        data-testid="debt-installment"
                      >
                        {roundBig(d.monthlyInstallment, 2).toString()}
                      </TableCell>
                      <TableCell data-testid="debt-next-due">
                        {d.nextDueDate}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid="debt-priority"
                        aria-label={`Priorità ${d.priority}`}
                      >
                        {d.priority}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(d)}
                            data-testid={`debt-row-${d.id}-edit`}
                            aria-label={`Modifica ${d.creditor}`}
                          >
                            <Pencil aria-hidden="true" />
                            Modifica
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(d)}
                            data-testid={`debt-row-${d.id}-delete`}
                            aria-label={`Elimina ${d.creditor}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 aria-hidden="true" />
                            Elimina
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent
          data-testid="debt-modal"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          {/* DialogTitle sr-only come PRIMO figlio: evita warning Radix. */}
          <DialogTitle className="sr-only" id={titleId}>
            {form.id ? "Modifica debito" : "Aggiungi debito"}
          </DialogTitle>
          <DialogHeader>
            <DialogTitle id={titleId}>
              {form.id ? "Modifica debito" : "Aggiungi debito"}
            </DialogTitle>
            <DialogDescription id={descriptionId}>
              Inserisci i dettagli del debito e salva per applicare le
              modifiche.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {validation && (
              <div
                role="alert"
                data-testid="debt-validation-alert"
                className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {validation}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="debt-creditor">Creditore</Label>
                <Input
                  id="debt-creditor"
                  type="text"
                  value={form.creditor}
                  onChange={(e) =>
                    setForm({ ...form, creditor: e.target.value })
                  }
                  data-testid="debt-input-creditor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debt-total">Totale</Label>
                <Input
                  id="debt-total"
                  type="number"
                  step="0.01"
                  value={form.totalAmount}
                  onChange={(e) =>
                    setForm({ ...form, totalAmount: e.target.value })
                  }
                  data-testid="debt-input-totalAmount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debt-remaining">Residuo</Label>
                <Input
                  id="debt-remaining"
                  type="number"
                  step="0.01"
                  value={form.remainingAmount}
                  onChange={(e) =>
                    setForm({ ...form, remainingAmount: e.target.value })
                  }
                  data-testid="debt-input-remainingAmount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debt-installment">Rata mensile</Label>
                <Input
                  id="debt-installment"
                  type="number"
                  step="0.01"
                  value={form.monthlyInstallment}
                  onChange={(e) =>
                    setForm({ ...form, monthlyInstallment: e.target.value })
                  }
                  data-testid="debt-input-monthlyInstallment"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debt-next-due">Data prossima scadenza</Label>
                <Input
                  id="debt-next-due"
                  type="date"
                  value={form.nextDueDate}
                  onChange={(e) =>
                    setForm({ ...form, nextDueDate: e.target.value })
                  }
                  data-testid="debt-input-nextDueDate"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debt-priority">
                  Priorità (1 = massima)
                </Label>
                <Select
                  id="debt-priority"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: e.target.value })
                  }
                  data-testid="debt-input-priority"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="debt-risk">Rischio se non pagato (opzionale)</Label>
                <Input
                  id="debt-risk"
                  type="text"
                  value={form.riskIfUnpaid}
                  onChange={(e) =>
                    setForm({ ...form, riskIfUnpaid: e.target.value })
                  }
                  data-testid="debt-input-risk"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="debt-notes">Note</Label>
                <Textarea
                  id="debt-notes"
                  rows={2}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  data-testid="debt-input-notes"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={close}
              data-testid="debt-modal-cancel"
            >
              Annulla
            </Button>
            <Button
              onClick={handleSave}
              data-testid="debt-modal-save"
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog di conferma eliminazione (sostituisce window.confirm) */}
      <Dialog
        open={confirmingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmingDelete(null);
        }}
      >
        <DialogContent
          data-testid="debt-delete-confirm-modal"
          aria-labelledby="debt-delete-confirm-title"
        >
          {/* DialogTitle come PRIMO figlio diretto: Radix lo cerca
             al primo mount con un useEffect e avvisa se non lo
             trova. Renderizzarlo qui evita il warning console.error
             che farebbe fallire i test con console-fail-test. */}
          <DialogTitle className="sr-only" id="debt-delete-confirm-title">
            Eliminare il debito?
          </DialogTitle>
          <DialogHeader>
            <DialogTitle id="debt-delete-confirm-title">
              Eliminare il debito?
            </DialogTitle>
            <DialogDescription>
              Stai per eliminare il debito verso "{confirmingDelete?.creditor}".
              L'azione è irreversibile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmingDelete(null)}
              data-testid="debt-delete-cancel"
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              data-testid="debt-delete-confirm"
            >
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
