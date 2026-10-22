"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeNames, locales } from "@/lib/i18n";

// Plain links (not a select) so crawlers can follow them and every language stays discoverable.
export default function LanguageSwitcher({ locale, label }) {
  const pathname = usePathname() || `/${locale}`;
  const rest = pathname.split("/").slice(2).join("/");
  const hrefFor = (l) => `/${l}${rest ? `/${rest}` : ""}`;

  return (
    <details className="lang">
      <summary aria-label={label}>
        <span aria-hidden="true">🌐</span> {localeNames[locale]}
      </summary>
      <ul>
        {locales.map((l) => (
          <li key={l}>
            <Link href={hrefFor(l)} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}>
              {localeNames[l]}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
