import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import LanguageSwitcher from "./LanguageSwitcher";

function BrandMark() {
  return <span className="studio-brand-icon" aria-hidden="true"><svg viewBox="0 0 44 44" fill="none"><path d="M11 10.5h22a6 6 0 0 1 6 6v11a6 6 0 0 1-6 6H23l-8 6v-6h-4a6 6 0 0 1-6-6v-11a6 6 0 0 1 6-6Z" fill="currentColor"/><path d="m22 15.5-2 6.3-6.1 2.2 6.1 2 2 6.5 2.1-6.5 6-2-6-2.2-2.1-6.3Z" fill="#101511"/></svg></span>;
}

export function SiteHeader({ locale, dict }) {
  return (
    <header className="site-header">
      <div className="container bar">
        <Link href={`/${locale}`} className="brand" aria-label={`${SITE_NAME} — ${dict.nav.home}`}><BrandMark /><span>{SITE_NAME}<i className="brand-dot">.</i></span></Link>
        <nav aria-label="Main" className="nav">
          <Link className="studio-nav-home" href={`/${locale}`}>{dict.nav.home}</Link>
          <Link href={`/${locale}/safety`}>{dict.nav.safety}</Link>
          <Link href={`/${locale}/underground`} className="nav-side-feature">Music room</Link>
          <LanguageSwitcher locale={locale} label={dict.nav.language} />
          <Link href={`/${locale}/start`} className="btn btn-small">{dict.nav.start}<span aria-hidden="true">↗</span></Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ locale, dict }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="studio-footer-brand"><Link href={`/${locale}`} className="brand"><BrandMark /><span>{SITE_NAME}<i className="brand-dot">.</i></span></Link><p>{dict.footer.tagline}</p></div>
        <nav aria-label="Footer" className="footer-links">
          <Link href={`/${locale}/safety`}>{dict.nav.safety}</Link>
          <Link href="/en/terms">{dict.nav.terms}</Link>
          <Link href="/en/privacy">{dict.nav.privacy}</Link>
        </nav>
      </div>
      <div className="container fine"><span>© {new Date().getFullYear()} {SITE_NAME}. {dict.footer.rights}</span><span>18+ · {dict.home.ctaNote}</span></div>
    </footer>
  );
}
