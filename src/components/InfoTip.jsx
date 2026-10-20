import { useEffect, useId, useRef, useState } from "react";

export function InfoTip({ label, children, align = "start" }) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState(null);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();

  function letak() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const width = Math.min(320, window.innerWidth * 0.7);
    let left = align === "end" ? rect.right - width : rect.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    const batas = window.innerHeight - 8;
    let top = rect.bottom + 6;
    let maxHeight = Math.max(120, Math.min(420, batas - top));
    if (maxHeight < 180 && rect.top > maxHeight) {
      maxHeight = Math.max(120, Math.min(420, rect.top - 14));
      top = Math.max(8, rect.top - 6 - maxHeight);
    }
    return { top, left, width, maxHeight };
  }

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
    function tutupGeser() {
      setOpen(false);
    }
    if (align === "end") {
      window.addEventListener("scroll", tutupGeser, true);
      window.addEventListener("resize", tutupGeser);
    }
    return () => {
      document.removeEventListener("pointerdown", tutup);
      document.removeEventListener("keydown", tombol);
      window.removeEventListener("scroll", tutupGeser, true);
      window.removeEventListener("resize", tutupGeser);
    };
  }, [open, align]);

  return (
    <span className="info-tip" ref={rootRef}>
      <button
        type="button"
        className="info-tip-button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        ref={buttonRef}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          if (align === "end") setBox(letak());
          setOpen(true);
        }}
      >
        i
      </button>
      {open ? (
        <span
          className="info-tip-panel"
          id={panelId}
          role="note"
          style={
            align === "end" && box
              ? { position: "fixed", top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight, overflow: "auto" }
              : undefined
          }
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
