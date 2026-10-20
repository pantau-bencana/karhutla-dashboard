import { applyAnalisis, catWilayah } from "./analisisPantauBencana.js";
import { CAP_DATA_TERAKHIR, PEMBARUAN_TERAKHIR_LABEL, applyNowcast, ringkasanNowcast } from "./capKab.js";
import { applyDasarian } from "./dasarianManual.js";
import { DISCLAIMER_UNDUH, teksStatusUnduh } from "./banjirExport.js";
import { bnpbAsDibi } from "./bnpbBanjir.js";
import { buildFloodRows, urutStatusKab } from "./floodMatrix.js";
import { POTENSI_LABEL, bacaPenduduk, lampirkanPenduduk, ringkasPendudukBerstatus } from "./pendudukKab.js";
import { indeksPrakiraan, periodeTigaHari, terapkanHari } from "./prakiraanHujan.js";

function angkaAtauNull(value) {
  return value == null ? null : value;
}

export function susunRingkasan(input, now = new Date()) {
  const capAlerts = input.capAlerts ?? [];
  const capMeta = { ...(input.capMeta ?? {}) };
  const capStatus = capAlerts.length || capMeta.status === "ok" ? "ok" : "gagal";
  capMeta.status = capStatus;
  const dibi = bnpbAsDibi(input.dibiRows ?? []);
  const dasar = buildFloodRows({
    banjir: input.banjir ?? [],
    multi: [],
    dibi,
    dibiLoaded: Boolean(input.dibiLoaded),
    wilayah: (input.banjir ?? []).map((row) => ({
      kode: row.kode_wilayah,
      nama: row.nama_big || row.kabupaten_irbi,
      provinsi: row.provinsi,
    })),
  });
  const withNowcast = applyAnalisis(applyNowcast(dasar, capAlerts, capMeta, now));
  const periode = periodeTigaHari(now);
  const indeks = indeksPrakiraan(input.prakiraanStatus === "ok" ? input.prakiraanRows ?? [] : []);
  const penduduk = bacaPenduduk(input.pendudukRows ?? []);
  const ringkas = ringkasanNowcast(capAlerts, capMeta, now);
  const tabs = [
    { id: "0-3-jam", tab: "cap", label: "0–3 jam", tanggal: "" },
    { id: "hari-ini", tab: 0, label: "Hari ini", tanggal: periode.hari[0] },
    { id: "besok", tab: 1, label: "Besok", tanggal: periode.hari[1] },
    { id: "lusa", tab: 2, label: "Lusa", tanggal: periode.hari[2] },
  ].map((spec) => {
    const konteks = {
      tab: spec.tab,
      cakupan: capStatus === "ok" ? capMeta.cakupan || "" : "",
      tertunda: spec.tab === "cap" && Boolean(ringkas.tertunda),
    };
    const withHari = spec.tab === "cap" ? withNowcast : terapkanHari(withNowcast, indeks, spec.tanggal, periode.hari);
    const withDasarian = applyDasarian(withHari, input.dasarianRows ?? [], {
      status: input.dasarianStatus || "gagal",
      now,
    });
    const bertanda = withDasarian.map((row) => {
      const peta = catWilayah(row, konteks);
      return { ...row, peta, statusTab: peta.status || null };
    });
    const urut = urutStatusKab(lampirkanPenduduk(bertanda, penduduk, "ok"));
    const total = ringkasPendudukBerstatus(urut, penduduk);
    const hitung = (status) => urut.filter((row) => row.peta?.kind === "status" && row.peta.status === status).length;
    return {
      id: spec.id,
      label: spec.label,
      tanggal: spec.tanggal,
      kedaluwarsa: spec.tab === "cap" ? Boolean(ringkas.kedaluwarsa) : false,
      catatan: spec.tab === "cap" && ringkas.kedaluwarsa ? CAP_DATA_TERAKHIR : "",
      total: {
        kab: urut.length,
        awas: hitung("Awas"),
        siaga: hitung("Siaga"),
        waspada: hitung("Waspada"),
        tanpa_status: urut.filter((row) => row.peta?.kind === "kosong").length,
        tanpa_data: urut.filter((row) => row.peta?.kind === "nodata").length,
        potensi_penduduk: angkaAtauNull(total.penduduk),
        potensi_rumah: angkaAtauNull(total.rumah),
        potensi_label: POTENSI_LABEL,
      },
      rows: urut.map((row, index) => ({
        no: index + 1,
        kode: row.kode,
        kab_kota: row.nama,
        provinsi: row.provinsi,
        status: teksStatusUnduh(row),
        lampau: Boolean(row.peta?.lampau),
        historis: row.dibiTeks || "",
        irbi: row.banjirKelas || "",
        potensi_penduduk: row.peta?.kind === "status" ? angkaAtauNull(row.pendudukItem?.penduduk) : null,
        potensi_rumah: row.peta?.kind === "status" ? angkaAtauNull(row.pendudukItem?.rumahTangga) : null,
        berlaku_sampai: [...(row.nowcastAlerts ?? []), ...(row.nowcastLampau ?? [])].reduce(
          (best, alert) => ((alert.expires || "") > best ? alert.expires : best),
          "",
        ),
      })),
    };
  });
  return {
    generated_at: now.toISOString(),
    pembaruan_terakhir: ringkas.fetchedAt || "",
    pembaruan_label: PEMBARUAN_TERAKHIR_LABEL,
    periode: periode.label,
    disclaimer: DISCLAIMER_UNDUH,
    potensi_label: POTENSI_LABEL,
    cap: {
      fetched_at: ringkas.fetchedAt || "",
      rss_published: capMeta.rss_published || "",
      cakupan: capMeta.cakupan || "",
      kedaluwarsa: Boolean(ringkas.kedaluwarsa),
      tertunda: Boolean(ringkas.tertunda),
      catatan: ringkas.kedaluwarsa ? CAP_DATA_TERAKHIR : "",
    },
    prakiraan: {
      fetched_at: input.prakiraanFetchedAt || "",
      observed_at: input.prakiraanObservedAt || "",
    },
    tabs,
  };
}
