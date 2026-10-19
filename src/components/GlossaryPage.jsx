import { useMemo, useState } from "react";
import { GLOSSARY } from "../lib/glossary.js";
import { glossaryTermFromHash } from "../lib/route.js";

export function GlossaryPage({ embedded = false, term = "" }) {
  const focus = term || glossaryTermFromHash(window.location.hash);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const ordered = [...GLOSSARY].sort((a, b) => a.istilah.localeCompare(b.istilah, "id"));
    if (!needle) return ordered;
    return ordered.filter((item) =>
      [item.istilah, item.nama, item.penjelasan, item.penggunaan].join(" ").toLowerCase().includes(needle),
    );
  }, [query]);
  const groups = new Map();
  for (const item of filtered) {
    const letter = item.istilah.slice(0, 1).toUpperCase();
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(item);
  }

  const body = (
    <div id="glosarium">
      <section className="card">
        <header className="card-head">
          <div>
            <h2>Glosarium</h2>
            <p>Singkatan dan istilah yang dipakai dasbor. Jika tidak ada rujukan resmi, keterangannya deskriptif.</p>
          </div>
        </header>
        <div className="logic-body">
          <label>
            Cari istilah
            <input
              className="glossary-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Misalnya ISPU, dasarian, hotspot"
            />
          </label>
          {!filtered.length ? <p className="empty">Tidak ada istilah yang cocok.</p> : null}
        </div>
      </section>
      {[...groups.entries()].map(([letter, items]) => (
        <section key={letter} className="card" aria-labelledby={`huruf-${letter}`}>
          <header className="card-head">
            <h2 id={`huruf-${letter}`}>{letter}</h2>
          </header>
          <div className="logic-body glossary-list">
            {items.map((item) => (
              <article key={item.id} id={item.id} className={item.id === focus ? "glossary-hit" : undefined}>
                <h3>
                  {item.istilah}
                  {item.nama && item.nama !== item.istilah ? <span className="subline"> {item.nama}</span> : null}
                </h3>
                <p>{item.penjelasan}</p>
                <p className="fine">Di dasbor ini: {item.penggunaan}</p>
                {item.rujukan ? (
                  <p>
                    <a href={item.rujukan} target="_blank" rel="noopener noreferrer">
                      {item.rujukanLabel || item.rujukan}
                    </a>
                  </p>
                ) : (
                  <p className="fine">Tidak ada rujukan resmi yang dikutip untuk butir ini.</p>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
  if (embedded) return body;
  return <main className="wrap main">{body}</main>;
}
