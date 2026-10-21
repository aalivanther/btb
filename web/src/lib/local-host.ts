const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function isLocalOrigin(getHeader: (name: string) => string | null): boolean {
  return isLocalHostHeader(getHeader("host"));
}

export function isLocalHostHeader(hostHeader: string | null): boolean {
  if (hostHeader === null) {
    return false;
  }
  const first = hostHeader.split(",")[0]?.trim().toLowerCase() ?? "";
  if (first === "") {
    return false;
  }
  return LOOPBACK_HOSTS.has(hostnameOf(first));
}

function hostnameOf(host: string): string {
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end === -1 ? host : host.slice(1, end);
  }
  const colon = host.lastIndexOf(":");
  if (colon === -1) {
    return host;
  }
  const tail = host.slice(colon + 1);
  const head = host.slice(0, colon);
  if (!/^\d+$/.test(tail) || head.includes(":")) {
    return host;
  }
  return head;
}
