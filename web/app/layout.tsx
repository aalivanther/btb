import type { Metadata, Viewport } from "next";
import type { JSX, ReactNode } from "react";
import localFont from "next/font/local";
import "./globals.css";
import Background from "@/components/Background";
import { Providers } from "@/components/Providers";

const bangers = localFont({
  src: "./fonts/bangers.ttf",
  weight: "400",
  variable: "--font-bangers",
  display: "swap",
});

const bungee = localFont({
  src: "./fonts/bungee.ttf",
  weight: "400",
  variable: "--font-bungee",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: "./fonts/spacegrotesk.ttf",
  weight: "300 700",
  variable: "--font-grotesk",
  display: "swap",
});

const shantellSans = localFont({
  src: "./fonts/shantellsans.ttf",
  weight: "300 800",
  variable: "--font-comic",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geistmono.ttf",
  weight: "100 900",
  variable: "--font-geist-mono",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const SITE_DESCRIPTION =
  "BTB — Be The Boss: agregador de lanzamientos de videojuegos de PlayStation, Xbox, Nintendo y PC, con una línea de tiempo navegable de lo que viene.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "BTB — Be The Boss",
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "BTB — Be The Boss",
    title: "BTB — Be The Boss",
    description: SITE_DESCRIPTION,
    locale: "es_MX",
  },
  twitter: {
    card: "summary_large_image",
    title: "BTB — Be The Boss",
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0e0b18",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var m=localStorage.getItem('btb:viewmode:v1');" +
              "var mob=m==='movil'||((m===null||m==='auto')&&window.matchMedia('(max-width: 900px)').matches);" +
              "if(m==='escritorio')mob=false;" +
              "document.documentElement.dataset.view=mob?'mobile':'desktop';}catch(e){" +
              "document.documentElement.dataset.view='desktop';}})();",
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('btb:theme:v1');" +
              "if(t==='noir'||t==='vivo'){document.documentElement.dataset.theme=t;}}catch(e){}})();",
          }}
        />
      </head>
      <body
        className={`${bangers.variable} ${bungee.variable} ${spaceGrotesk.variable} ${shantellSans.variable} ${geistMono.variable}`}
      >
        <svg
          aria-hidden="true"
          focusable="false"
          style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
        >
          <defs>
            <filter id="comic-posterize" colorInterpolationFilters="sRGB">
              <feComponentTransfer>
                <feFuncR type="discrete" tableValues="0.13 0.55 1" />
                <feFuncG type="discrete" tableValues="0.13 0.55 1" />
                <feFuncB type="discrete" tableValues="0.13 0.55 1" />
              </feComponentTransfer>
              <feColorMatrix type="saturate" values="1.75" />
            </filter>
            <filter id="comic-ink" colorInterpolationFilters="sRGB">
              <feComponentTransfer in="SourceGraphic" result="post">
                <feFuncR type="discrete" tableValues="0.13 0.55 1" />
                <feFuncG type="discrete" tableValues="0.13 0.55 1" />
                <feFuncB type="discrete" tableValues="0.13 0.55 1" />
              </feComponentTransfer>
              <feColorMatrix in="post" type="saturate" values="1.75" result="cel" />
              <feConvolveMatrix
                in="cel"
                order="3"
                kernelMatrix="1 1 1 1 -8 1 1 1 1"
                preserveAlpha="true"
                result="edge"
              />
              <feColorMatrix
                in="edge"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 -2.4 -2.4 0 1"
                result="ink"
              />
              <feMorphology in="ink" operator="dilate" radius="0.45" result="inkfat" />
              <feMerge>
                <feMergeNode in="cel" />
                <feMergeNode in="inkfat" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        <Background />

        <Providers>
          <div className="relative z-[1]">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
