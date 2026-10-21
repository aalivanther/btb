"use client";

import { useEffect, useRef, useState } from "react";

import { HalftoneImage } from "@/components/comic/kit";

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
