import { pageHref } from "../lib/route.js";

export function SiteHeader({ eyebrow, title, subtitle, loadedAt, loading, onReload, page, showReload }) {
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
          <nav className="site-nav" aria-label="Halaman">
            <a href={pageHref("dashboard")} aria-current={page === "dashboard" ? "page" : undefined}>
              Dashboard
            </a>
            <a href={pageHref("logika")} aria-current={page === "logika" ? "page" : undefined}>
              Logika Pemantauan
            </a>
          </nav>
          {showReload ? (
            <div className="header-actions">
              {loadedAt ? <p>Dimuat {loadedAt}</p> : null}
              <button type="button" className="button" onClick={onReload} disabled={loading}>
                {loading ? "Memuat…" : "Muat ulang"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
