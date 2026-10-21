import type { JSX } from "react";

import { ui } from "@/lib/i18n";

const SKELETON_DAY_COUNT = 7;

export default function Loading(): JSX.Element {
  return (
    <div aria-busy="true" role="status" className="font-ui">
      <span className="sr-only">Cargando {ui.timeline.headingTitle}…</span>

      <div
        className="flex items-center gap-4 px-4 py-3 sm:gap-6 sm:px-10"
        style={{ borderBottom: "1px solid var(--color-border-soft)" }}
      >
        <SkeletonBlock className="h-9 w-[120px] rounded-sm" />
        <div className="flex gap-2 sm:ml-3">
          <SkeletonBlock className="h-8 w-[64px] rounded-full" />
          <SkeletonBlock className="h-8 w-[84px] rounded-full" />
          <SkeletonBlock className="h-8 w-[72px] rounded-full" />
        </div>
        <span className="hidden flex-1 sm:block" aria-hidden="true" />
        <SkeletonBlock className="ml-auto h-9 w-[96px] rounded-full sm:ml-0" />
      </div>

      <div className="px-4 pt-12 pb-10 sm:px-10 sm:pt-16">
        <div className="max-w-[660px]">
          <SkeletonBlock className="mb-4 h-4 w-[180px] rounded-sm" />
          <SkeletonBlock className="mb-4 h-12 w-[80%] rounded-base" />
          <SkeletonBlock className="mb-5 h-4 w-[60%] rounded-sm" />
          <div className="flex gap-3">
            <SkeletonBlock className="h-11 w-[150px] rounded-full" />
            <SkeletonBlock className="h-11 w-[120px] rounded-full" />
          </div>
        </div>
      </div>

      <div className="px-4 pt-[10px] sm:px-10">
        <SkeletonBlock className="h-7 w-[200px] rounded-sm" />
        <SkeletonBlock className="mt-2 h-3 w-[320px] rounded-sm" />
      </div>

      <div className="flex items-end gap-[22px] overflow-hidden px-4 pt-8 pb-12 sm:px-10">
        {Array.from({ length: SKELETON_DAY_COUNT }).map((_, index) => (
          <div key={index} className="flex shrink-0 flex-col items-center">
            <div className="mb-[14px] flex w-[184px] flex-col gap-[10px]">
              <SkeletonBlock className="h-[66px] w-full rounded-sm" />
              <SkeletonBlock className="h-[66px] w-full rounded-sm" />
            </div>
            <SkeletonBlock className="mb-[9px] h-[9px] w-[9px] rounded-full" />
            <div className="flex flex-col items-center gap-2 pb-[30px]">
              <SkeletonBlock className="h-4 w-6 rounded-sm" />
              <SkeletonBlock className="h-3 w-8 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type SkeletonBlockProps = {
  className: string;
};

function SkeletonBlock({ className }: SkeletonBlockProps): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`tl-skeleton block ${className}`}
      style={{ background: "var(--color-surface)" }}
    />
  );
}
