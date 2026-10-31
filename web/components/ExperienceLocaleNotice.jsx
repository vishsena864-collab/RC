import Link from "next/link";

// The interactive experiences have not yet been localized beyond their shared
// navigation. We show this notice instead of misrepresenting English content
// as a translated page or advertising a false hreflang equivalent.
const NOTICES = {
  es: {
    message: "Esta experiencia todavía está disponible solo en inglés. Puedes volver a la página en español.",
    english: "Abrir la versión en inglés",
    home: "Volver al inicio en español",
  },
  pt: {
    message: "Esta experiência ainda está disponível apenas em inglês. Você pode voltar à página em português.",
    english: "Abrir a versão em inglês",
    home: "Voltar ao início em português",
  },
  fr: {
    message: "Cette expérience est pour le moment disponible uniquement en anglais. Vous pouvez revenir à l'accueil en français.",
    english: "Ouvrir la version anglaise",
    home: "Retour à l'accueil en français",
  },
  de: {
    message: "Dieses Erlebnis ist derzeit nur auf Englisch verfügbar. Du kannst zur deutschsprachigen Startseite zurückkehren.",
    english: "Englische Version öffnen",
    home: "Zur deutschen Startseite",
  },
};

export default function ExperienceLocaleNotice({ locale, slug }) {
  const notice = NOTICES[locale];
  if (!notice) return null;
  return (
    <aside className="experience-language-note" aria-label="Language availability">
      <span>{notice.message}</span>
      <div>
        <Link href={`/en/${slug}`} hrefLang="en" lang="en">{notice.english} ↗</Link>
        <Link href={`/${locale}`} hrefLang={locale}>{notice.home} ↗</Link>
      </div>
    </aside>
  );
}
