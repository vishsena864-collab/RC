import "../../experience-header.css";
import GraffitiWall from "@/components/GraffitiWall";
import JsonLd from "@/components/JsonLd";
import ExperienceLocaleNotice from "@/components/ExperienceLocaleNotice";
import { experienceMetadata, experienceJsonLd } from "@/lib/experience-meta";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return experienceMetadata(locale, "graffiti-wall");
}

export default async function GraffitiWallPage({ params }) {
  const { locale } = await params;
  return (
    <>
      {locale === "en" ? <JsonLd data={experienceJsonLd("graffiti-wall")} /> : null}
      <ExperienceLocaleNotice locale={locale} slug="graffiti-wall" />
      <GraffitiWall locale={locale} />
    </>
  );
}
