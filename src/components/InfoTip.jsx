import { useEffect, useId, useRef, useState } from "react";

export function InfoTip({ label, children }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    function tutup(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    function tombol(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", tutup);
    document.addEventListener("keydown", tombol);
    return () => {
      document.removeEventListener("pointerdown", tutup);
      document.removeEventListener("keydown", tombol);
    };
  }, [open]);

  return (
    <span className="info-tip" ref={rootRef}>
      <button
        type="button"
        className="info-tip-button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        onClick={() => setOpen((current) => !current)}
      >
        i
      </button>
      {open ? (
        <span className="info-tip-panel" id={panelId} role="note">
          {children}
        </span>
      ) : null}
    </span>
  );
}
