import { HAZARDS } from "../lib/hazards.js";
import { formatWib } from "../lib/format.js";
import { hazardHref, pageHref } from "../lib/route.js";

const PAGES = [
  ["ringkasan", "Ringkasan"],
  ["peta", "Peta dan Data"],
  ["logika", "Logika Pemantauan"],
  ["sumber", "Sumber Data"],
  ["glosarium", "Glosarium"],
];

export function SiteHeader({ eyebrow, title, subtitle, manifest, freshness, onReload, loading, page, hazard }) {
  return (
    <header className="site-header">
      <div className="stripe" aria-hidden="true" />
      <div className="wrap header-inner">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="36" height="36">
              <rect width="32" height="32" rx="7" fill="#e8b931" />
              <path
                fill="#143028"
                d="M16 5c2 4 2 6-1 8 3 0 6 2 6 6a7 7 0 1 1-14 0c0-3 2-5 4-6-1 2-1 3 1 4-2-3-1-7 4-12z"
              />
            </svg>
          </span>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            {subtitle ? <p className="subtitle">{subtitle}</p> : null}
          </div>
        </div>
        <div className="header-side">
          <nav className="hazard-tabs" aria-label="Bahaya">
            {HAZARDS.map((item) => (
              <a key={item.id} href={hazardHref(item.id)} aria-current={hazard === item.id ? "page" : undefined}>
                {item.nama}
              </a>
            ))}
          </nav>
          <nav className="site-nav" aria-label="Halaman">
            {PAGES.map(([id, label]) => (
              <a key={id} href={pageHref(id, hazard)} aria-current={page === id ? "page" : undefined}>
                {label}
              </a>
            ))}
          </nav>
          <div className="header-actions">
            <p>Terakhir diperbarui {manifest?.generated_at ? formatWib(manifest.generated_at) : "belum ada snapshot"}</p>
            {freshness?.tertunda ? <p><strong>Data tertunda</strong></p> : null}
            {freshness?.nextVisible ? <p>Pembaruan berikutnya {formatWib(freshness.nextRun)}</p> : null}
            <button type="button" className="button" onClick={onReload} disabled={loading}>
              {loading ? "Memuat…" : "Muat ulang"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
