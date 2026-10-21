"use client";

import { useRef, useState, type FormEvent, type JSX } from "react";

import { useAuth } from "@/lib/auth-context";
import { ComicButton } from "@/components/comic/kit";
import { ui } from "@/lib/i18n";
import { useModalA11y } from "@/lib/use-modal-a11y";

type AuthPanelProps = {
  open: boolean;
  onClose: () => void;
};

type Mode = "login" | "register";

export function AuthPanel({ open, onClose }: AuthPanelProps): JSX.Element | null {
  if (!open) {
    return null;
  }
  return <AuthPanelDialog onClose={onClose} />;
}

type AuthPanelDialogProps = {
  onClose: () => void;
};

function AuthPanelDialog({ onClose }: AuthPanelDialogProps): JSX.Element {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const { onTrapKeyDown } = useModalA11y(cardRef, onClose, { lockScroll: false });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pending) {
      return;
    }
    setPending(true);
    const attempt = mode === "login" ? login(email, pass) : register(name, email, pass);
    void attempt
      .then((result) => {
        if (result.ok) {
          setError("");
          setName("");
          setEmail("");
          setPass("");
          onClose();
        } else {
          setError(result.error ?? ui.auth.errorGeneric);
        }
      })
      .catch(() => {
        setError(ui.auth.errorNoCrypto);
      })
      .finally(() => {
        setPending(false);
      });
  };

  return (
    <div
      className="pf-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? ui.auth.dialogLogin : ui.auth.dialogRegister}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="au-panel c-panel c-panel-violet c-panel-ht"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onTrapKeyDown}
      >
        <div className="pf-head">
          <h2 className="pf-title font-display">
            {mode === "login" ? ui.auth.titleLogin : ui.auth.titleRegister}
          </h2>
          <ComicButton variant="danger" ariaLabel={ui.auth.close} onClick={onClose} className="pf-close">
            ✕
          </ComicButton>
        </div>

        <div className="au-tabs">
          <button
            type="button"
            className={`au-tab font-label${mode === "login" ? " is-on" : ""}`}
            aria-pressed={mode === "login"}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            {ui.auth.tabLogin}
          </button>
          <button
            type="button"
            className={`au-tab font-label${mode === "register" ? " is-on" : ""}`}
            aria-pressed={mode === "register"}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            {ui.auth.tabRegister}
          </button>
        </div>

        <form className="au-form" onSubmit={submit}>
          {mode === "register" ? (
            <label className="au-field">
              <span className="au-label font-label">{ui.auth.nameLabel}</span>
              <input
                className="au-input font-ui"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder={ui.auth.namePlaceholder}
              />
            </label>
          ) : null}
          <label className="au-field">
            <span className="au-label font-label">{ui.auth.emailLabel}</span>
            <input
              className="au-input font-ui"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder={ui.auth.emailPlaceholder}
            />
          </label>
          <label className="au-field">
            <span className="au-label font-label">{ui.auth.passLabel}</span>
            <input
              className="au-input font-ui"
              type="password"
              value={pass}
              onChange={(event) => setPass(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder={ui.auth.passPlaceholder}
            />
          </label>

          {error !== "" ? (
            <p className="au-error font-ui" role="alert">
              {error}
            </p>
          ) : null}

          <ComicButton type="submit" variant="primary" bubble className="au-submit" disabled={pending}>
            {mode === "login" ? ui.auth.submitLogin : ui.auth.submitRegister}
          </ComicButton>
        </form>

        <p className="au-note font-ui">{ui.auth.localNote}</p>
      </div>
    </div>
  );
}
