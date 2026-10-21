"use client";

import { useEffect, type JSX } from "react";

import { ui } from "@/lib/i18n";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PublicError({ error, reset }: ErrorBoundaryProps): JSX.Element {
  useEffect(() => {
    console.error("public route render error:", error);
  }, [error]);

  return (
    <main className="font-ui px-4 py-10 sm:px-10 sm:py-16">
      <section className="mx-auto max-w-[1100px]">
        <div
          role="alert"
          className="rounded-base border p-6"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="font-display text-lg text-text">{ui.home.errorTitle}</p>
          <p className="mt-2 text-sm text-text-muted">{ui.home.errorRetryHint}</p>
          <button
            type="button"
            onClick={reset}
            className="font-mono mt-4 inline-flex w-fit cursor-pointer rounded-sm border border-gold-deep px-4 py-2 text-xs tracking-[0.08em] text-gold uppercase transition-colors hover:text-gold-bright"
            style={{ background: "var(--color-glass)" }}
          >
            {ui.home.errorRetry}
          </button>
        </div>
      </section>
    </main>
  );
}
