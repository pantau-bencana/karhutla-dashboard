import { PRIORITAS_DISCLAIMER, PRIORITAS_JENIS, PRIORITAS_JUDUL, tampilanPrioritas } from "./aplus.js";

export function karhutlaRankingPlan(snapshot, now = new Date()) {
  const view = tampilanPrioritas(snapshot, now);
  return {
    dapatDisusun: view.tersedia,
    status: view.tersedia ? PRIORITAS_JENIS : `Belum tersedia – ${view.alasan.join("; ")}`,
    judul: PRIORITAS_JUDUL,
    jenis: PRIORITAS_JENIS,
    disclaimer: PRIORITAS_DISCLAIMER,
    alasan: view.alasan,
    daftar: view.daftar,
    blok: view.blok,
  };
}
