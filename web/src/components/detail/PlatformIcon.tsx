import type { DeviceFamily } from "@/components/detail/helpers";

export function PlatformIcon({ family }: { family: DeviceFamily }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (family === "cloud") {
    return (
      <svg {...common}>
        <path d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.4A3.8 3.8 0 0 1 18 18H7Z" />
      </svg>
    );
  }
  if (family === "pc") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="12" rx="1.5" />
        <path d="M8 20h8M12 16v4" />
      </svg>
    );
  }
  if (family === "nintendo") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M12 4v16" />
        <circle cx="8" cy="8.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (family === "xbox") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M7 6c3 2 7 8 10 13M17 6c-3 2-7 8-10 13" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M6 9h12a3 3 0 0 1 3 3v3a2 2 0 0 1-3.6 1.2L15 14H9l-2.4 2.2A2 2 0 0 1 3 15v-3a3 3 0 0 1 3-3Z" />
      <path d="M7.5 12v2M6.5 13h2" />
    </svg>
  );
}
