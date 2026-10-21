"use client";

import { useState, type FormEvent, type JSX } from "react";

import { probeApi, saveSetup } from "@/lib/config-actions";
import { ComicButton } from "@/components/comic/kit";
import { loopbackOrigin, type SetupFlags } from "@/lib/env-file";
import { ui } from "@/lib/i18n";
import { MONTHS } from "@/lib/timeline";

export type CatalogMonthStatus = {
  year: number;
  month: number;
  count: number;
  ok: boolean;
};

export type RuntimeStatus = {
  url: string;
  reachable: boolean;
  gameCount: number;
  catalogOk: boolean;
  dealsOk: boolean;
  months: CatalogMonthStatus[];
};

type ConfigPanelProps = {
  flags: SetupFlags;
  runtime: RuntimeStatus;
};

export function ConfigPanel({ flags, runtime }: ConfigPanelProps): JSX.Element {
  const [shown, setShown] = useState(flags);
  const [apiUrl, setApiUrl] = useState(flags.apiUrl);
  const [twitchClientId, setTwitchClientId] = useState("");
  const [twitchClientSecret, setTwitchClientSecret] = useState("");
  const [rawgApiKey, setRawgApiKey] = useState("");
  const [revealSecrets, setRevealSecrets] = useState(false);
  const [pending, setPending] = useState<"probe" | "save" | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeOk, setNoticeOk] = useState<boolean | null>(null);

  const probe = () => {
    if (pending !== null) {
      return;
    }
    setPending("probe");
    setNotice("");
    setNoticeOk(null);
    const browserMessage = probeFromBrowser(apiUrl);
    void probeApi(apiUrl)
      .then(async (server) => {
        const browser = await browserMessage;
        setNoticeOk(browser.ok && server.ok);
        setNotice(`${browser.message} ${server.message}`);
      })
      .catch(() => {
        setNoticeOk(false);
        setNotice(ui.config.serverFail);
      })
      .finally(() => {
        setPending(null);
      });
  };

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (pending !== null) {
      return;
    }
    setPending("save");
    setNotice("");
    setNoticeOk(null);
    void saveSetup({ apiUrl, twitchClientId, twitchClientSecret, rawgApiKey })
      .then((result) => {
        setNotice(result.message);
        setNoticeOk(result.ok);
        if (result.ok) {
          setShown(result.flags);
          setApiUrl(result.flags.apiUrl);
          setTwitchClientId("");
          setTwitchClientSecret("");
          setRawgApiKey("");
          setRevealSecrets(false);
        }
      })
      .catch(() => {
        setNoticeOk(false);
        setNotice(ui.config.saveFailed);
      })
      .finally(() => {
        setPending(null);
      });
  };

  const secretType = revealSecrets ? "text" : "password";

  return (
    <>
      <section className="cfg-card" aria-labelledby="cfg-window-title">
        <p className="cfg-kicker font-label">{ui.config.stepNow}</p>
        <h2 id="cfg-window-title" className="font-display text-xl text-text">
          {ui.config.windowTitle}
        </h2>
        <p className="cfg-hint">{ui.config.windowRange}</p>
        <div className="cfg-months">
          {runtime.months.map((slot) => {
            const name = monthTitle(slot.month);
            const empty = slot.ok && slot.count === 0;
            return (
              <article
                key={`${slot.year}-${slot.month}`}
                className={`cfg-month${empty ? " is-empty" : ""}`}
              >
                <span className="cfg-month-name font-label">{name}</span>
                <span className="cfg-month-year font-label">{slot.year}</span>
                <span className="cfg-month-count font-display">
                  {slot.ok ? String(slot.count) : "—"}
                </span>
                <span className="cfg-hint">
                  {slot.ok
                    ? empty
                      ? ui.config.monthEmpty
                      : ui.config.monthInSeed
                    : ui.config.monthFailed}
                </span>
              </article>
            );
          })}
        </div>
        <p className="cfg-hint">{ui.config.windowNote}</p>
      </section>

      <section className="cfg-card" aria-labelledby="cfg-live-title">
        <p className="cfg-kicker font-label">{ui.config.stepLive}</p>
        <h2 id="cfg-live-title" className="font-display text-xl text-text">
          {ui.config.liveTitle}
        </h2>
        <p className="cfg-hint">{ui.config.runtimeUrl(runtime.url)}</p>
        <div className="cfg-status">
          <StatusChip ok={runtime.reachable} on={ui.config.runtimeUp} off={ui.config.runtimeDown} />
          <StatusChip
            ok={runtime.catalogOk}
            on={ui.config.games(runtime.gameCount)}
            off={ui.config.catalogDown}
          />
          <StatusChip ok={runtime.dealsOk} on={ui.config.dealsUp} off={ui.config.dealsDown} />
        </div>
        <h3 className="cfg-sub font-label">{ui.config.keysTitle}</h3>
        <div className="cfg-status">
          <StatusChip ok={shown.twitchId} on={ui.config.twitchIdOn} off={ui.config.twitchIdOff} />
          <StatusChip
            ok={shown.twitchSecret}
            on={ui.config.twitchSecretOn}
            off={ui.config.twitchSecretOff}
          />
          <StatusChip ok={shown.rawg} on={ui.config.rawgOn} off={ui.config.rawgOff} />
        </div>
      </section>

      <form className="cfg-card" onSubmit={save}>
        <p className="cfg-kicker font-label">{ui.config.stepKeys}</p>
        <fieldset className="cfg-fieldset">
          <legend className="font-label">{ui.config.connectionTitle}</legend>
          <label className="cfg-field">
            <span>{ui.config.apiLabel}</span>
            <input
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              inputMode="url"
            />
            <span className="cfg-hint">{ui.config.apiHint}</span>
          </label>
          <div className="cfg-actions">
            <ComicButton type="button" variant="ghost" onClick={probe} disabled={pending !== null}>
              {pending === "probe" ? ui.config.probing : ui.config.probe}
            </ComicButton>
          </div>
        </fieldset>

        <fieldset className="cfg-fieldset">
          <legend className="font-label">{ui.config.keysFormTitle}</legend>
          <label className="cfg-field">
            <span>{ui.config.idLabel}</span>
            <input
              value={twitchClientId}
              onChange={(event) => setTwitchClientId(event.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <label className="cfg-field">
            <span>{ui.config.secretLabel}</span>
            <span className="cfg-secret-row">
              <input
                type={secretType}
                value={twitchClientSecret}
                onChange={(event) => setTwitchClientSecret(event.target.value)}
                autoComplete="new-password"
                spellCheck={false}
              />
              <button
                type="button"
                className="cfg-reveal font-label"
                aria-pressed={revealSecrets}
                onClick={() => setRevealSecrets((value) => !value)}
              >
                {revealSecrets ? ui.config.hideSecret : ui.config.showSecret}
              </button>
            </span>
          </label>
          <label className="cfg-field">
            <span>{ui.config.rawgLabel}</span>
            <span className="cfg-secret-row">
              <input
                type={secretType}
                value={rawgApiKey}
                onChange={(event) => setRawgApiKey(event.target.value)}
                autoComplete="new-password"
                spellCheck={false}
              />
            </span>
            <span className="cfg-hint">{ui.config.rawgHint}</span>
          </label>
          <p className="cfg-hint">{ui.config.keepHint}</p>
          <div className="cfg-actions">
            <ComicButton type="submit" disabled={pending !== null}>
              {pending === "save" ? ui.config.saving : ui.config.save}
            </ComicButton>
          </div>
        </fieldset>
        <p
          className={`cfg-result${noticeOk === true ? " is-ok" : ""}${noticeOk === false ? " is-bad" : ""}`}
          role="status"
          aria-live="polite"
        >
          {notice}
        </p>
      </form>
    </>
  );
}

function monthTitle(month: number): string {
  const raw = MONTHS[month] ?? "";
  if (raw.length === 0) {
    return String(month);
  }
  return raw.charAt(0) + raw.slice(1).toLowerCase();
}

function StatusChip({ ok, on, off }: { ok: boolean; on: string; off: string }): JSX.Element {
  return <span className={ok ? "cfg-chip is-ok" : "cfg-chip is-miss"}>{ok ? on : off}</span>;
}

async function probeFromBrowser(rawUrl: string): Promise<{ ok: boolean; message: string }> {
  const checked = loopbackOrigin(rawUrl);
  if (!checked.ok) {
    return { ok: false, message: ui.config.browserBad };
  }
  try {
    const response = await fetch(`${checked.origin}/healthz`, {
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    return response.ok
      ? { ok: true, message: ui.config.browserOk }
      : { ok: false, message: ui.config.browserFail };
  } catch {
    return { ok: false, message: ui.config.browserFail };
  }
}
