"use client";

import { useEffect, useRef, useState } from "react";

import { HalftoneImage, type HalftoneIntensity } from "@/components/comic/kit";
import { useNearViewport } from "@/lib/use-near-viewport";

type LazyHalftoneCoverProps = {
  url: string;
  seed: number;
  className?: string;
};

export function LazyHalftoneCover({ url, seed, className = "" }: LazyHalftoneCoverProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(url === "");

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px 600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <span ref={ref} className="ct-cover-lazy" aria-hidden="true">
      <HalftoneImage url={visible ? url : ""} seed={seed} intensity="soft" className={className} />
    </span>
  );
}

type LazyHalftoneImageProps = {
  url: string;
  seed: number;
  intensity?: HalftoneIntensity;
  className?: string;
};

// LazyHalftoneImage se ve igual que HalftoneImage mientras la foto carga, pero solo la pide
// cuando la tarjeta se acerca a la vista.
export function LazyHalftoneImage(props: LazyHalftoneImageProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const near = useNearViewport(ref);
  return <HalftoneImage {...props} ref={ref} deferImage={!near} />;
}
