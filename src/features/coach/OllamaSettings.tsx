/**
 * `OllamaSettings` — the configuration form for the local Ollama
 * coach and the user's base settings.
 *
 * Manages the user's `CoachSettings`:
 *   - URL (default `http://localhost:11434`, must be http(s))
 *   - model (default `llama3.2`, must be non-empty)
 *   - AI enabled toggle (default `true`)
 *   - emergency buffer (default 0, must be non-negative)
 *   - base currency (default `EUR`, must be in `currenciesList`)
 *
 * "Test connection" button calls `port.ping(url, signal)` and renders
 * a green/yellow/red badge. The badge uses BOTH a colored background
 * AND a visible text label so WCAG 1.4.1 is satisfied.
 *
 * Persists via `useCoachSettings().setSettings(settings, true)` —
 * the `true` flag pushes the change to the undo stack (matches the
 * Guitos `BudgetContext` contract).
 *
 * The page is a pure form — the Ollama HTTP client is built locally
 * on demand. v1 has no separate route for settings; this component
 * is imported by the dashboard or a future `/settings` page.
 */
import Big from "big.js";
import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { currenciesList } from "../../lists/currenciesList";
import { createOllamaService } from "../daily-coach/infrastructure/ollamaService";
import type { CoachSettings } from "./coachSettings";
import { useCoach } from "./useCoach";
import { useCoachSettings } from "./useCoachSettings";

const DEFAULTS: CoachSettings = {
  ollamaBaseUrl: "http://localhost:11434",
  modelName: "llama3.2",
  aiEnabled: true,
  emergencyBuffer: new Big(0),
  baseCurrency: "EUR",
};

const isHttpUrl = (raw: string): boolean => {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const toBig = (raw: string, fallback = 0): Big => {
  if (raw.trim() === "" || raw.trim() === "-") return new Big(fallback);
  try {
    return new Big(raw);
  } catch {
    return new Big(fallback);
  }
};

type ConnState = "green" | "yellow" | "red" | "none";

const CONN_META: Record<
  Exclude<ConnState, "none">,
  { label: string; bg: string; textColor: string; border: string }
> = {
  green: {
    label: "OK",
    bg: "bg-coach-green",
    textColor: "text-coach-green-fg",
    border: "border-coach-green",
  },
  yellow: {
    label: "RAGGIUNGIBILE — MODELLO MANCANTE",
    bg: "bg-coach-yellow",
    textColor: "text-coach-yellow-fg",
    border: "border-coach-yellow",
  },
  red: {
    label: "NON RAGGIUNGIBILE",
    bg: "bg-coach-red",
    textColor: "text-coach-red-fg",
    border: "border-coach-red",
  },
};

export function OllamaSettings() {
  const { settings, setSettings } = useCoachSettings();
  const { turns, addTurn, setState, lastNarrationSource } = useCoach();
  const current: CoachSettings = settings ?? DEFAULTS;
  const [draft, setDraft] = useState<CoachSettings>(current);
  const [validation, setValidation] = useState<string | null>(null);
  const [connState, setConnState] = useState<ConnState>("none");
  const [connDetail, setConnDetail] = useState<string>("");

  // Touch a few unused imports to keep the tree-shake honest for v1.
  void turns;
  void addTurn;
  void setState;
  void lastNarrationSource;

  const update = <K extends keyof CoachSettings>(
    key: K,
    value: CoachSettings[K],
  ) => setDraft((d) => ({ ...d, [key]: value }));

  const handleSave = () => {
    if (draft.modelName.trim() === "") {
      setValidation("Il nome del modello è obbligatorio.");
      return;
    }
    if (!isHttpUrl(draft.ollamaBaseUrl)) {
      setValidation("L'URL di Ollama deve essere un URL http(s).");
      return;
    }
    if (draft.emergencyBuffer.lt(0)) {
      setValidation("Il fondo emergenza non può essere negativo.");
      return;
    }
    if (!currenciesList.includes(draft.baseCurrency)) {
      setValidation(`La valuta "${draft.baseCurrency}" non è supportata.`);
      return;
    }
    setSettings(draft, true);
    setValidation(null);
  };

  const handleTest = async () => {
    setConnState("none");
    setConnDetail("");
    if (!isHttpUrl(draft.ollamaBaseUrl)) {
      setConnState("red");
      setConnDetail("L'URL non è http(s).");
      return;
    }
    const port = createOllamaService({
      baseUrl: draft.ollamaBaseUrl,
      model: draft.modelName,
    });
    const controller = new AbortController();
    try {
      const result = await port.ping(draft.ollamaBaseUrl, controller.signal);
      if (!result.reachable) {
        setConnState("red");
        setConnDetail("Server non raggiungibile.");
      } else if (result.modelPresent) {
        setConnState("green");
        setConnDetail(`Connesso; "${draft.modelName}" è disponibile.`);
      } else {
        setConnState("yellow");
        setConnDetail(`Server raggiungibile, ma "${draft.modelName}" manca.`);
      }
    } catch {
      setConnState("red");
      setConnDetail("Errore di rete.");
    } finally {
      controller.abort();
    }
  };

  const connMeta = connState === "none" ? null : CONN_META[connState];

  return (
    <div
      className="py-3"
      data-testid="ollama-page"
      role="region"
      aria-label="Impostazioni Ollama"
    >
      <h1
        className="font-display text-2xl font-semibold mb-3"
        data-testid="ollama-page-title"
      >
        Impostazioni Ollama
      </h1>
      <Card className="mb-3" data-testid="ollama-form-card">
        <CardContent className="p-5">
          {validation && (
            <div
              role="alert"
              data-testid="ollama-validation-alert"
              className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive px-4 py-3 text-sm"
            >
              {validation}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ollama-url">URL Ollama</Label>
              <Input
                id="ollama-url"
                type="url"
                value={draft.ollamaBaseUrl}
                onChange={(e) => update("ollamaBaseUrl", e.target.value)}
                data-testid="ollama-input-url"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ollama-model">Modello</Label>
              <Input
                id="ollama-model"
                type="text"
                value={draft.modelName}
                onChange={(e) => update("modelName", e.target.value)}
                data-testid="ollama-input-model"
              />
            </div>
            <div className="flex items-center gap-3 pt-1.5">
              <Switch
                id="ollama-ai-enabled-switch"
                checked={draft.aiEnabled}
                onCheckedChange={(checked) => update("aiEnabled", checked)}
                data-testid="ollama-input-aiEnabled"
              />
              <Label htmlFor="ollama-ai-enabled-switch" className="cursor-pointer">
                Mentore AI attivo
              </Label>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ollama-emergency-buffer">Fondo emergenza</Label>
              <Input
                id="ollama-emergency-buffer"
                type="number"
                step="0.01"
                min={0}
                value={draft.emergencyBuffer.toString()}
                onChange={(e) =>
                  update("emergencyBuffer", toBig(e.target.value, 0))
                }
                data-testid="ollama-input-emergencyBuffer"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ollama-base-currency">Valuta principale</Label>
              <select
                id="ollama-base-currency"
                value={draft.baseCurrency}
                onChange={(e) => update("baseCurrency", e.target.value)}
                data-testid="ollama-input-baseCurrency"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {currenciesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3 items-center flex-wrap">
            <Button
              type="button"
              onClick={handleSave}
              data-testid="ollama-save-button"
            >
              Salva
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              data-testid="ollama-test-button"
            >
              Verifica connessione
            </Button>
            {connMeta && (
              <Badge
                data-testid="ollama-connection-badge"
                data-state={connState}
                role="status"
                aria-label={`Connessione ${connMeta.label}`}
                className={`${connMeta.bg} ${connMeta.textColor} ${connMeta.border} px-3 py-1.5 text-sm font-semibold`}
              >
                {connMeta.label}
              </Badge>
            )}
          </div>
          {connMeta && connDetail && (
            <p
              className="text-muted-foreground mt-2 mb-0 text-sm"
              data-testid="ollama-connection-detail"
            >
              {connDetail}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
