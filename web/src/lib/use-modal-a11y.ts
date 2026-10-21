"use client";

import { useCallback, useEffect, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type ModalA11yOptions = {
  lockScroll?: boolean;
};

export function useModalA11y(
  cardRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  options: ModalA11yOptions = {},
): { onTrapKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void } {
  const { lockScroll = false } = options;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const card = cardRef.current;
    if (card !== null) {
      const firstFocusable = card.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      firstFocusable?.focus();
    }
    return () => {
      if (previouslyFocused !== null && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!lockScroll) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lockScroll]);

  const onTrapKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (event.key !== "Tab") {
        return;
      }
      const card = cardRef.current;
      if (card === null) {
        return;
      }
      const focusables = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const firstFocusable = focusables[0];
      const lastFocusable = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    },
    [cardRef],
  );

  return { onTrapKeyDown };
}
