export const meta = {
  name: 'translate-to-italian',
  description: 'Traduci TUTTI i testi inglesi residui in italiano nei file feature',
  phases: [
    { title: 'Traduzione file', detail: 'un agente per file' },
    { title: 'Test + build + verify', detail: 'regression check finale' },
  ],
};

const TONE = `
TONO E REGOLE DI TRADUZIONE

L'app è un coach finanziario personale: warm, amichevole, informale (usa "tu/il tuo", MAI "Lei").
Espressioni chiave:
- "Daily Coach" / "Coach Quotidiano" → mantieni il brand name
- "Set up a plan" → "Imposta il piano"
- "Save" → "Salva"
- "Cancel" → "Annulla"
- "Delete" → "Elimina"
- "Edit" → "Modifica"
- "Add" → "Aggiungi"
- "Loading" → "Caricamento"
- "Try again" → "Riprova"
- "Required" → "obbligatorio"
- "Optional" → "facoltativo" (se user-facing)
- "Amount" → "Importo"
- "Description" → "Descrizione"
- "Category" → "Categoria"
- "Date" → "Data"
- "Today" → "Oggi"
- "Tomorrow" → "Domani"
- "Yesterday" → "Ieri"
- "Settings" → "Impostazioni"
- "Search" → "Cerca"
- "Filter" → "Filtra"
- "Export" → "Esporta"
- "Import" → "Importa"
- "Apply" → "Applica" o "Registra" (a seconda del contesto)
- "Coach" (il personaggio) → "Mentore" (mantieni "Coach Quotidiano" come brand)
- "Active" → "attiv" + (count === 1 ? "o" : "i")
- "Notes" → "Note"
- "Type" → "Tipo"
- "From" → "Da"
- "To" → "A"
- "Submit" → "Invia"
- "Confirm" → "Conferma"
- "Yes" → "Sì"
- "No" → "No"

REGOLE TECNICHE
1. NON tradurre MAI: import, type, prop, function, variabili, URL, path, nomi file
2. NON tradurre: class Tailwind ("text-sm"), CSS var, color tokens
3. NON tradurre: nomi componenti lucide-react (BarChart3, Calculator, ecc.)
4. NON tradurre: commenti di codice (possono restare in inglese)
5. NON tradurre: stringhe inviate a LLM (i prompt di sistema) — ma i label UI sì
6. TRADUCI: tutto il testo visibile all'utente (JSX, aria-label, title, alt, placeholder, button text, toast)
7. TRADUCI: data-testid SOLO se contengono parole UI inglesi (es. "daily-coach-dashboard" può restare per compatibilità test)
8. Per le costanti del codice (es. TYPE_LABELS, KIND_LABELS, mode labels), traduci ma mantieni la struttura
9. Aggiorna SOLO le stringhe inglesi. NON toccare test in italiano già fatti.
10. Le chiavi degli oggetti (es. { title: "Daily budget" }) restano in camelCase inglese, ma i VALORI vanno tradotti.
11. Per le Priority/Debt: usa "Massima / Alta / Media / Bassa / Minima"
12. Per "Over budget" / "Under budget" → "Sforato" / "Nel budget"
13. Per "Recurring" → "Ricorrente"
14. Per "One-shot" / "one-shot" → "Una tantum"
15. Per "Coming soon" → "In arrivo"
16. Per "Quick questions" → "Domande rapide"
17. Per "Test connection" → "Verifica connessione"
18. Per "Live daily budget" → "Budget giornaliero in tempo reale"
19. Per "Effect on today" / "Effect on next 7 days" → "Impatto su oggi" / "Impatto sui prossimi 7 giorni"
20. Per "New daily budget" → "Nuovo budget giornaliero"
21. Per "Set up a monthly plan first" → "Imposta prima il piano mensile"
22. Per "Can I afford this?" → "Posso permettermelo?"
23. Per "Recompute" → "Ricalcola"
24. Per "AI enabled" / "AI disabled" → "Mentore AI attivo" / "Mentore AI disattivato"
25. Per "Base currency" → "Valuta principale"
26. Per "Emergency buffer" → "Fondo emergenza"
27. Per "OK" / "REACHABLE" / "UNREACHABLE" → mantieni uppercase, traduci se possibile
28. Per i "Status: ..." aria-label, segui il pattern
29. Per la descrizione automatica "Simulator purchase: X" → "Acquisto dal simulatore: X"
30. Per "of" nei contatori (es. "5 of 10") → "di" (es. "5 di 10")
31. Per "You can spend X per day for the next Y days" → "Puoi spendere X al giorno per i prossimi Y giorni"
32. Per "Projected balance at the end of the period" → "Saldo previsto a fine periodo"
33. Per "Shortfall — adjust the plan" → "Buco — rivedi il piano"
34. Per "Days" (plurale) → "giorni"
35. Per "Goals" (plurale) → "obiettivi"
36. Per "Active" → "attiv" + (count === 1 ? "o" : "i")
37. Per "Overdue" → "In ritardo" / "Scaduto" (a seconda del contesto)
38. Per "Tap ... to start" → "Tocca ... per iniziare"
39. Per "In the red" → "In rosso"
40. Per "Left to spend" → "Ti resta da spendere"
41. Per "Over the daily budget" → "Hai superato il budget giornaliero"
42. Per "So far today" → "Finora oggi"
43. Per "No plan yet" → "Nessun piano ancora"
44. Per "Spent today" → "Speso oggi"
45. Per "Remaining today" → "Ti restano oggi"
46. Per "Save today" → "Risparmia oggi"
47. Per "Next income in" → "Prossima entrata tra"
48. Per "End of period" → "Fine periodo"
49. Per "Daily budget" → "Budget giornaliero"

Dopo la traduzione, esegui:
   cd "C:/Users/Erica/Desktop/progetti AI/Daily_financial_coach" && pnpm exec vitest run <path> 2>&1 | tail -20
e fixa ogni test che si rompe per via della traduzione (es. se un test fa query per "Daily budget" ora deve cercare "Budget giornaliero").
`;

const FILES = [
  'src/features/monthly-plan/MonthlyPlanPage.tsx',
  'src/features/debts/DebtsPage.tsx',
  'src/features/coach/OllamaSettings.tsx',
  'src/features/simulator/AffordabilitySimulator.tsx',
  'src/features/transactions/TransactionsPage.tsx',
  'src/features/transactions/TransactionsTable.tsx',
  'src/features/coach/CoachPage.tsx',
  'src/features/dashboard/DailyBudgetCard.tsx',
  'src/features/dashboard/SpentTodayCard.tsx',
  'src/features/dashboard/RemainingTodayCard.tsx',
  'src/features/dashboard/DailySaveQuotaCard.tsx',
  'src/features/dashboard/DaysToNextIncomeCard.tsx',
  'src/features/dashboard/EndOfMonthForecastCard.tsx',
  'src/features/dashboard/EmptyPlanCard.tsx',
  'src/features/dashboard/AlertsCard.tsx',
  'src/features/dashboard/ActionOfTheDayCard.tsx',
  'src/features/dashboard/StatusCard.tsx',
  'src/features/dashboard/RoutePlaceholder.tsx',
  'src/features/goals/SavingsGoalsPage.tsx',
];

phase('Traduzione file')
const results = await Promise.all(FILES.map(f => agent(
  `Traduci TUTTO in italiano nel file: ${f}

${TONE}

PASSI:
1. Leggi il file sorgente
2. Identifica TUTTE le stringhe inglesi user-facing (JSX, aria-label, title, placeholder, button text, toast, errori, validation, oggetti UI)
3. Traducile in italiano naturale usando il tono specificato
4. NON toccare: import, type, prop, function, nomi variabili, CSS classi, commenti, system prompt LLM
5. Se il file ha un test file associato (es. DailyBudgetCard.test.tsx), leggilo e aggiornalo per riflettere le traduzioni (es. se testava "Daily budget" ora deve testare "Budget giornaliero")
6. Dopo la modifica, esegui:
   cd "C:/Users/Erica/Desktop/progetti AI/Daily_financial_coach" && pnpm exec vitest run <path-del-file> 2>&1 | tail -25
7. Se i test falliscono, leggili e aggiorna i test per riflettere le traduzioni
8. Itera finché tutti i test passano per questo file

Restituisci:
- numero di stringhe tradotte
- lista dei test modificati (se applicabile)
- stato finale (green/red)`,
  { label: `translate:${f.replace(/[\/.]/g, '-').replace(/^src-features-/, '')}`, phase: 'Traduzione file' }
).then(r => ({ file: f, ok: true, summary: r })).catch(e => ({ file: f, ok: false, summary: String(e).slice(0, 500) }))));

const failures = results.filter(r => !r.ok);
log(`Translate phase: ${results.length - failures.length}/${results.length} OK`);
if (failures.length) log('Failed: ' + failures.map(f => f.file).join(', '));

phase('Test + build + verify')
const verify = await agent(`Run full regression and report.

Working dir: C:/Users/Erica/Desktop/progetti AI/Daily_financial_coach

DO:
1. cd into the project, run: pnpm test:unit --run 2>&1 | tail -40
2. If any tests fail, report the failing test file + test name + reason
3. If all pass, confirm with the pass count
4. Also run: pnpm build 2>&1 | tail -15
5. Report any build errors

Return: total tests / passing / failing + list of any remaining issues.`,
  { label: 'verify:regression', phase: 'Test + build + verify' });

return { results, verify };
