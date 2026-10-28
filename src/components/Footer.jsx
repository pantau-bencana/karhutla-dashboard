import { identitasTampil } from "../lib/identitas.js";

const IDENTITY_V01 = "Pantau Bencana v0.1 — proyek data terbuka komunitas, bukan produk BNPB, BMKG, PVMBG, atau KLH.";
const IDENTITY = identitasTampil() || IDENTITY_V01;

export function Footer() {
  return (
    <footer className="footer">
      <p>
        <strong>{IDENTITY}</strong> Setiap angka mencantumkan sumber, jenis data (observasi, prakiraan, model pembanding, statis, atau tautan), dan waktu data. Hotspot adalah deteksi satelit, bukan konfirmasi kebakaran. Data model pihak ketiga bukan prakiraan resmi.
      </p>
      <p>Kode sumber terbuka di GitHub: pantau-bencana/karhutla-dashboard. Lisensi dan atribusi tiap sumber ada di halaman Sumber & Metode. <a href="#/sumber-metode/glosarium">Glosarium</a>.</p>
    </footer>
  );
}
