import Link from "next/link";
import { fmt } from "@/lib/format";
import { LEGAL_UPDATED, legal } from "@/lib/legal";
import { CONTACT_EMAIL, HAS_CONTACT, SITE_NAME, SITE_URL } from "@/lib/site";

// Legal text is English only. Other languages link here with lang="en" so screen readers and
// translation tools handle it correctly.
const DOCS = [["privacy", "Privacy Policy"], ["cookies", "Cookie Policy"], ["terms", "Terms of Use"]];

function Block({ block, vars }) {
  if (typeof block === "string") return <p>{fmt(block, vars)}</p>;
  if (block.list) return <ul>{block.list.map((item) => <li key={item}>{fmt(item, vars)}</li>)}</ul>;
  if (block.table) {
    return (
      <div className="legal-table">
        <table>
          <thead><tr>{block.table.head.map((cell) => <th key={cell} scope="col">{cell}</th>)}</tr></thead>
          <tbody>{block.table.rows.map((row) => <tr key={row[0]}>{row.map((cell, i) => i === 0 ? <th key={i} scope="row">{fmt(cell, vars)}</th> : <td key={i}>{fmt(cell, vars)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  return null;
}

export default function LegalPage({ kind, title }) {
  const doc = legal[kind];
  // Until a real address is configured, point people at the in-app tools rather than a placeholder inbox.
  const contact = HAS_CONTACT ? CONTACT_EMAIL : "the Report button in any chat (a contact email address will be listed here soon)";
  const vars = { name: SITE_NAME, contact, site: SITE_URL.replace(/^https?:\/\//, "") };

  return (
    <div className="container prose legal" lang="en">
      <h1>{title}</h1>
      <p className="note">{LEGAL_UPDATED}</p>
      <nav className="legal-nav" aria-label="Legal documents">
        {DOCS.map(([id, label]) => (id === kind ? <span key={id} aria-current="page">{label}</span> : <Link key={id} href={`/en/${id}`}>{label}</Link>))}
      </nav>
      {doc.sections.map((s) => (
        <section key={s.h}>
          <h2>{fmt(s.h, vars)}</h2>
          {s.p.map((block, i) => <Block key={i} block={block} vars={vars} />)}
        </section>
      ))}
    </div>
  );
}
