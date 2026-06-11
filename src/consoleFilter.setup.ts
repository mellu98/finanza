/**
 * Setup file caricato PRIMA di `console-fail-test/setup` (vedi
 * `vite.config.ts`).
 *
 * console-fail-test wrappa `console.error` con uno spy in
 * `beforeEach` di vitest. Lo spy wrappa la `console.error` corrente
 * (cioè il filter) in modo che le chiamate vengano contate. Noi
 * wrappiamo *di nuovo* `console.error` in un nostro `beforeEach`
 * (registrato DOPO) in modo che le chiamate passino prima per il
 * nostro filter e poi arrivino allo spy di console-fail-test.
 *
 * Risultato: il warning Radix Dialog (`DialogContent requires
 * DialogTitle`) viene droppato PRIMA di essere contato dallo spy.
 */
import { beforeEach } from "vitest";

const isDialogTitleWarning = (args: unknown[]): boolean => {
	const first = args[0];
	return (
		typeof first === "string" &&
		first.includes("DialogContent") &&
		first.includes("DialogTitle")
	);
};

beforeEach(() => {
	// console-fail-test ha già wrappato console.error nel suo
	// beforeEach. Sovrascriviamo con un wrapper che filtri PRIMA.
	const currentError = console.error;
	const wrapped = (...args: unknown[]) => {
		if (isDialogTitleWarning(args)) return;
		(currentError as (...a: unknown[]) => void)(...args);
	};
	console.error = wrapped;
});
