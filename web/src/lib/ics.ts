import type { WishItem } from "@/lib/profile-context";

const PRODID = "-//BTB//Better Than Backlog//ES";

const UID_DOMAIN = "betterthanbacklog";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

function compactDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

function foldLine(line: string): string {
  const MAX_LENGTH = 75;
  if (line.length <= MAX_LENGTH) {
    return line;
  }
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, MAX_LENGTH));
  rest = rest.slice(MAX_LENGTH);
  while (rest.length > 0) {
    chunks.push(` ${rest.slice(0, MAX_LENGTH - 1)}`);
    rest = rest.slice(MAX_LENGTH - 1);
  }
  return chunks.join("\r\n");
}

export function buildICS(items: WishItem[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const item of items) {
    if (!ISO_DATE_PATTERN.test(item.releaseDate)) {
      continue;
    }
    const dateCompact = compactDate(item.releaseDate);
    lines.push("BEGIN:VEVENT");
    lines.push(foldLine(`UID:${item.id}@${UID_DOMAIN}`));
    lines.push(`DTSTAMP:${dateCompact}T000000Z`);
    lines.push(`DTSTART;VALUE=DATE:${dateCompact}`);
    lines.push(foldLine(`SUMMARY:${escapeText(`Sale: ${item.title}`)}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function countICSEvents(items: WishItem[]): number {
  let count = 0;
  for (const item of items) {
    if (ISO_DATE_PATTERN.test(item.releaseDate)) {
      count += 1;
    }
  }
  return count;
}
