import { fmt } from "@/lib/format";
import { legal } from "@/lib/legal";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/site";

// Legal text is English only. Other languages link here with lang="en" so screen readers and
// translation tools handle it correctly.
export default function LegalPage({ kind, title }) {
  const doc = legal[kind];
  const vars = { name: SITE_NAME, email: CONTACT_EMAIL };

  return (
    <div className="container prose" lang="en">
      <h1>{title}</h1>
      <p className="note">{doc.updated}</p>
      {doc.sections.map((s) => (
        <section key={s.h}>
          <h2>{fmt(s.h, vars)}</h2>
          {s.p.map((para) => (
            <p key={para}>{fmt(para, vars)}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
