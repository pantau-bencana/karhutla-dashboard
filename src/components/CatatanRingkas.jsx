export function CatatanRingkas({ judul = "Catatan metode", id, children }) {
  return (
    <details className="catatan-ringkas" id={id}>
      <summary>{judul}</summary>
      <div className="catatan-isi">{children}</div>
    </details>
  );
}
