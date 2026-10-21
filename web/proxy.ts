import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isLocalOrigin } from "./src/lib/local-host";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/configuracion" || path.startsWith("/configuracion/")) {
    if (!isLocalOrigin((name) => request.headers.get(name))) {
      return new NextResponse("Not Found", {
        status: 404,
        headers: { "X-Robots-Tag": "noindex" },
      });
    }
    const response = NextResponse.next();
    response.headers.set("X-Robots-Tag", "noindex");
    return response;
  }

  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminUser || !adminPass) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "X-Robots-Tag": "noindex",
      },
    });
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    const providedUser = decoded.slice(0, separatorIndex);
    const providedPass = decoded.slice(separatorIndex + 1);

    if (providedUser === adminUser && providedPass === adminPass) {
      const response = NextResponse.next();
      response.headers.set("X-Robots-Tag", "noindex");
      return response;
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Panel de administración", charset="UTF-8"',
      "X-Robots-Tag": "noindex",
    },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/configuracion", "/configuracion/:path*"],
};
