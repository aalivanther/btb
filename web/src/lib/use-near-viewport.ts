"use client";

import { useEffect, useState, type RefObject } from "react";

// Margen amplio: la imagen (o el componente) se pide bastante antes de entrar en pantalla.
export const NEAR_VIEWPORT_MARGIN = "800px";

// El margen de IntersectionObserver solo agranda la raíz; si el elemento vive dentro de un
// contenedor con scroll propio (por ejemplo el modal de ficha), ese contenedor recorta y el
// margen no serviría. Por eso se observa contra el contenedor con scroll vertical más cercano.
function scrollRootOf(el: Element): Element | null {
  for (let node = el.parentElement; node !== null; node = node.parentElement) {
    if (node === document.body || node === document.documentElement) {
      return null;
    }
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") {
      return node;
    }
  }
  return null;
}

// useNearViewport vale true desde que el elemento queda a menos de rootMargin de la zona visible,
// y se queda en true: sirve para pedir imágenes o montar piezas pesadas solo cuando hacen falta.
export function useNearViewport(
  ref: RefObject<Element | null>,
  rootMargin: string = NEAR_VIEWPORT_MARGIN,
): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { root: scrollRootOf(el), rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, ref, rootMargin]);

  return near;
}
