import "../../experience-header.css";
import UndergroundFM from "@/components/underground/UndergroundFM";
import JsonLd from "@/components/JsonLd";
import { experienceMetadata, experienceJsonLd } from "@/lib/experience-meta";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return experienceMetadata(locale, "underground");
}

export default async function UndergroundPage({ params }) {
  const { locale } = await params;
  return (
    <>
      {locale === "en" ? <JsonLd data={experienceJsonLd("underground")} /> : null}
      <UndergroundFM locale={locale} />
    </>
  );
}
