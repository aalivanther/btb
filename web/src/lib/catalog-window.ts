export type CatalogSlot = {
  year: number;
  month: number;
};

export const CATALOG_WINDOW: readonly CatalogSlot[] = [
  { year: 2026, month: 10 },
  { year: 2026, month: 11 },
  { year: 2026, month: 12 },
  { year: 2027, month: 1 },
];

export function slotKey(year: number, month: number): number {
  return year * 100 + month;
}
