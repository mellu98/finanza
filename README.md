# Daily Financial Coach

A local-first daily financial coach that helps you answer *"how much can I
spend today?"*

Daily Financial Coach keeps every plan, transaction, goal, and debt in your
browser. Nothing leaves your device, nothing syncs to a server. An optional
local Ollama integration can narrate your daily budget; without it, a
deterministic rules engine answers the same questions.

## Features

- **Daily budget** — at a glance, how much you can spend today.
- **Monthly plan** — revenue, fixed expenses, savings goal, next income date.
- **Transactions** — sortable, searchable ledger with classification.
- **Savings goals** — target, deadline, daily quota, progress.
- **Debts & deadlines** — sort by priority, never miss a due date.
- **Coach** — deterministic rules engine, with optional Ollama narration.
- **"Can I afford this?"** — yes / no / attention on a candidate purchase.
- **Local backup** — full-state export / import as a single JSON file.

## Install

Requirements: a modern browser. No server, no account, no telemetry.

```bash
# clone, then from the project root
pnpm install
```

The app is a PWA: once installed, it works offline.

## Run

```bash
# dev server (http://localhost:5173)
pnpm start

# production build + preview (http://localhost:4173)
pnpm build
pnpm serve
```

## Coach setup (Ollama)

The Coach works without any AI: a deterministic rules engine computes your
mode (Survival / Recovery / Steady / Growth) and three actions for the day.
For richer narration, point Daily Financial Coach at a local Ollama instance:

1. Install [Ollama](https://ollama.com) and pull a small model:
   ```bash
   ollama pull llama3.2
   ```
2. Start the Ollama server (default `http://localhost:11434`).
3. Open **Settings → Coach**, set the URL and model, enable AI.
4. If Ollama is unreachable, the UI shows a yellow banner and falls back to
   the deterministic engine — the experience stays usable.

Allow the browser to call Ollama by setting `OLLAMA_ORIGINS=*` before
starting the Ollama server. See the [Ollama docs](https://github.com/ollama/ollama/blob/main/docs/faq.md#how-do-i-configure-ollama-server)
for details.

## Roadmap

Daily Financial Coach is delivered in seven chained PRs:

| PR | Title | Status |
| --- | --- | --- |
| #1 | Rebrand + git init + dep hygiene | this PR |
| #2 | Engines kernel | planned |
| #3 | Domain & persistence | planned |
| #4 | Coach orchestration | planned |
| #5 | UI: dashboard + budget + plan | planned |
| #6 | UI: goals, debts, transactions, coach, simulator | planned |
| #7 | Backup + docs + e2e | planned |

See `docs/` for the full proposal, specs, design, and task breakdown.

## Disclaimer

> **Daily Financial Coach is a budgeting tool, not a substitute for
> professional financial advice. Always consult a qualified advisor for
> material financial decisions.**

Daily Financial Coach is provided **"as is"** without any **warranty**. Use
at your own risk. See [SECURITY.md](SECURITY.md) for how to report issues.

## License

This project is licensed under the **GNU Affero General Public License v3**.
See [LICENSE](LICENSE) for the full text.
