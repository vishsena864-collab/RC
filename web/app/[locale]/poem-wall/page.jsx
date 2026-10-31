import "../../experience-header.css";
import PoemWall from "@/components/PoemWall";
import JsonLd from "@/components/JsonLd";
import ExperienceLocaleNotice from "@/components/ExperienceLocaleNotice";
import { experienceMetadata, experienceJsonLd } from "@/lib/experience-meta";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return experienceMetadata(locale, "poem-wall");
}

export default async function PoemWallPage({ params }) {
  const { locale } = await params;
  return (
    <>
      {locale === "en" ? <JsonLd data={experienceJsonLd("poem-wall")} /> : null}
      <ExperienceLocaleNotice locale={locale} slug="poem-wall" />
      <PoemWall locale={locale} />
    </>
  );
}
