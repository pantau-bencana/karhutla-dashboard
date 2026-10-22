export function KeteranganMobile({ children }) {
  return (
    <details className="keterangan-sempit">
      <summary>Keterangan</summary>
      <div className="keterangan-isi">{children}</div>
    </details>
  );
}
