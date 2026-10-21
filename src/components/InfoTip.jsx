import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { letakInfoTip } from "../lib/infoTipLetak.js";

export function InfoTip({ label, children, align = "start" }) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();
  const judulId = useId();

  function ukur() {
    const rect = buttonRef.current?.getBoundingClientRect();
    return letakInfoTip({
      rect: rect
        ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
        : null,
      lebar: window.innerWidth,
      tinggi: window.innerHeight,
      align,
    });
  }

  function tutup(kembaliFokus) {
    const tombol = buttonRef.current;
    setOpen(false);
    if (kembaliFokus && tombol) window.setTimeout(() => tombol.focus(), 0);
  }

  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    panel?.querySelector("[data-tutup]")?.focus();

    function diLuar(event) {
      if (panelRef.current?.contains(event.target)) return;
      if (buttonRef.current?.contains(event.target)) return;
      tutup(false);
    }
    function tombolKeyboard(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        tutup(true);
        return;
      }
      if (event.key !== "Tab") return;
      const kotak = panelRef.current;
      if (!kotak) return;
      const nodes = [...kotak.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex='-1'])")];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const aktif = document.activeElement;
      if (event.shiftKey && (aktif === first || !kotak.contains(aktif))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (aktif === last || !kotak.contains(aktif))) {
        event.preventDefault();
        first.focus();
      }
    }
    function geser(event) {
      if (panelRef.current?.contains(event.target)) return;
      setBox(ukur());
    }
    document.addEventListener("pointerdown", diLuar);
    document.addEventListener("keydown", tombolKeyboard);
    window.addEventListener("resize", geser);
    window.addEventListener("scroll", geser, true);
    return () => {
      document.removeEventListener("pointerdown", diLuar);
      document.removeEventListener("keydown", tombolKeyboard);
      window.removeEventListener("resize", geser);
      window.removeEventListener("scroll", geser, true);
    };
  }, [open, align]);

  const sheet = Boolean(box?.sheet);

  return (
    <span className="info-tip">
      <button
        type="button"
        className="info-tip-button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        aria-label={label}
        ref={buttonRef}
        onClick={() => {
          if (open) {
            tutup(true);
            return;
          }
          setBox(ukur());
          setOpen(true);
        }}
      >
        i
      </button>
      {open && box && typeof document !== "undefined"
        ? createPortal(
            <>
              {sheet ? <div className="info-tip-backdrop" /> : null}
              <div
                ref={panelRef}
                id={panelId}
                role="dialog"
                aria-modal={sheet ? "true" : "false"}
                aria-labelledby={judulId}
                className={sheet ? "info-tip-panel info-tip-sheet" : "info-tip-panel info-tip-popover"}
                style={
                  sheet
                    ? undefined
                    : { top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }
                }
              >
                <div className="info-tip-head">
                  <p className="info-tip-judul" id={judulId}>{label}</p>
                  <button type="button" className="info-tip-close" data-tutup onClick={() => tutup(true)}>
                    Tutup
                  </button>
                </div>
                <div className="info-tip-isi">{children}</div>
              </div>
            </>,
            document.body,
          )
        : null}
    </span>
  );
}
