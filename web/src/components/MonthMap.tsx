"use client";

import { type JSX } from "react";

import { CATALOG_WINDOW, slotKey } from "@/lib/catalog-window";
import { ui } from "@/lib/i18n";
import { useFilter } from "@/lib/timeline-context";

const MONTH_SHORT: Record<number, string> = {
  1: "ENE",
  2: "FEB",
  3: "MAR",
  4: "ABR",
  5: "MAY",
  6: "JUN",
  7: "JUL",
  8: "AGO",
  9: "SEP",
  10: "OCT",
  11: "NOV",
  12: "DIC",
};

const MONTH_LONG: Record<number, string> = {
  1: "enero",
  2: "febrero",
  3: "marzo",
  4: "abril",
  5: "mayo",
  6: "junio",
  7: "julio",
  8: "agosto",
  9: "septiembre",
  10: "octubre",
  11: "noviembre",
  12: "diciembre",
};

export function MonthMap(): JSX.Element {
  const { filter, setFilter } = useFilter();
  const slots = CATALOG_WINDOW;

  const { monthFrom, monthTo } = filter;
  const hasRange = monthFrom > 0 || monthTo > 0;
  const activeFrom = monthFrom > 0 ? monthFrom : monthTo;
  const activeTo = monthTo > 0 ? monthTo : monthFrom;

  const pickMonth = (key: number) => {
    if (!hasRange) {
      setFilter({ monthFrom: key, monthTo: key });
      return;
    }
    if (activeFrom === activeTo) {
      if (key === activeFrom) {
        setFilter({ monthFrom: 0, monthTo: 0 });
        return;
      }
      setFilter({
        monthFrom: Math.min(activeFrom, key),
        monthTo: Math.max(activeFrom, key),
      });
      return;
    }
    setFilter({ monthFrom: key, monthTo: key });
  };

  const clearRange = () => {
    setFilter({ monthFrom: 0, monthTo: 0 });
  };

  const labelOf = (key: number): string => {
    const year = Math.floor(key / 100);
    const month = key % 100;
    return `${MONTH_LONG[month] ?? ""} de ${year}`;
  };
  const summaryText = !hasRange
    ? ui.timeline.monthMapAll
    : activeFrom === activeTo
      ? ui.timeline.monthMapOne(labelOf(activeFrom))
      : ui.timeline.monthMapRange(labelOf(activeFrom), labelOf(activeTo));

  return (
    <div className="mm-root" role="group" aria-label={ui.timeline.monthMapLabel}>
      <span className="mm-cap font-label" aria-hidden="true">
        {ui.timeline.monthMapCap}
      </span>
      <div className="mm-chips">
        <button
          type="button"
          className={`mm-chip mm-chip-all${!hasRange ? " is-on" : ""}`}
          aria-pressed={!hasRange}
          onClick={clearRange}
        >
          {ui.timeline.monthMapAllChip}
        </button>
        {slots.map((slot) => {
          const key = slotKey(slot.year, slot.month);
          const inRange = hasRange && key >= activeFrom && key <= activeTo;
          const isEndpoint = hasRange && (key === activeFrom || key === activeTo);
          const short = MONTH_SHORT[slot.month] ?? String(slot.month);
          return (
            <button
              key={key}
              type="button"
              className={`mm-chip${inRange ? " is-in" : ""}${isEndpoint ? " is-end" : ""}`}
              aria-pressed={inRange}
              aria-label={`${MONTH_LONG[slot.month] ?? short} de ${slot.year}`}
              onClick={() => pickMonth(key)}
            >
              {short}
              <span className="mm-chip-year">{String(slot.year).slice(2)}</span>
            </button>
          );
        })}
      </div>
      <span className="mm-summary font-label" role="status">
        {summaryText}
      </span>
      <span className="mm-note font-label">{ui.timeline.windowNote}</span>
    </div>
  );
}
