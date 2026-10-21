import Link from "next/link";

import { attribution, ui } from "@/lib/i18n";

const IGDB_ATTRIBUTION =
  "This product uses the IGDB API but is not endorsed or certified by IGDB or Twitch.";

export function Footer() {
  return (
    <footer className="tlx-footer font-ui">
      <span className="tlx-footer-igdb">
        <span role="img" aria-label={attribution.igdbLogoAlt} className="tlx-footer-logo font-label">
          IGDB
        </span>
        <span lang="en" className="tlx-footer-note">
          {IGDB_ATTRIBUTION}
        </span>
      </span>

      <Link href="/configuracion" className="tlx-footer-config font-label">
        {ui.config.footerLink}
      </Link>

      <span className="tlx-footer-region font-label">{attribution.region}</span>
    </footer>
  );
}
