import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import { BATAS_KAB_FILE } from "../lib/batasKab.js";
import { formatTanggal, formatWib } from "../lib/format.js";
import { IRBI_PENGGUNAAN_INTERNAL } from "../lib/floodMatrix.js";
import { gambarRekap } from "../lib/rekapGambar.js";
import { pptxRekap } from "../lib/rekapPptx.js";
import {
  REKAP_BAGIAN,
  PEMBANDING_LENCANA,
  REKAP_IDENTITAS,
  REKAP_UNDUH,
  SIPONGI_URL,
  barisRekap,
  catatanParameter,
  lembarRekap,
  PARAM_FIRMS,
  nilaiParameter,
  papanAtas,
  tanggalParameter,
  warnaRekap,
} from "../lib/rekapHarian.js";
import { xlsxLembar } from "../lib/xlsxMini.js";

const BERKAS = "data/live/rekap-harian.json";

function simpanBerkas(nama, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nama;
  link.click();
  URL.revokeObjectURL(url);
}

async function pngDari(canvas) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("PNG tidak terbentuk.");
  return new Uint8Array(await blob.arrayBuffer());
}

function parameterDari(bagianId, id) {
  return REKAP_BAGIAN.find((item) => item.id === bagianId)?.parameter.find((item) => item.id === id);
}

export function RekapHarian() {
  const [rekap, setRekap] = useState(null);
  const [galat, setGalat] = useState("");
  const [provinsi, setProvinsi] = useState("");
  const [pilihan, setPilihan] = useState({ karhutla: "hotspot", banjir: "cuaca" });
  const [tanggalPilih, setTanggalPilih] = useState({ karhutla: "", banjir: "" });
  const [fitur, setFitur] = useState([]);
  const [pesan, setPesan] = useState("");
  const kanvasKarhutla = useRef(null);
  const kanvasBanjir = useRef(null);
  const kanvas = { karhutla: kanvasKarhutla, banjir: kanvasBanjir };
  const provinsiPilihan = useMemo(() => [...new Set(barisRekap(null, "").map((item) => item.provinsi))], []);

  useEffect(() => {
    let batal = false;
    fetch(new URL(BERKAS, document.baseURI).href, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Cuplikan rekap belum ada.");
        return response.json();
      })
      .then((data) => {
        if (!batal) setRekap(data);
      })
      .catch((error) => {
        if (!batal) setGalat(error.message || "Cuplikan rekap tidak termuat.");
      });
    fetch(new URL(BATAS_KAB_FILE, document.baseURI).href)
      .then((response) => response.json())
      .then((topo) => {
        if (batal) return;
        const geo = feature(topo, topo.objects.kabupaten);
        setFitur(geo.features.map((item) => ({ kode: item.properties?.kode, geometry: item.geometry })));
      })
      .catch(() => {
        if (!batal) setPesan("Batas kabupaten tidak termuat. Tabel tetap ditampilkan.");
      });
    return () => {
      batal = true;
    };
  }, []);

  useEffect(() => {
    if (!rekap) return;
    setTanggalPilih((saat) => {
      const berikut = { ...saat };
      for (const bagian of REKAP_BAGIAN) {
        const param = parameterDari(bagian.id, pilihan[bagian.id]);
        const tanggal = tanggalParameter(rekap, param);
        if (!tanggal.includes(berikut[bagian.id])) {
          berikut[bagian.id] = tanggal.includes(rekap.hariWib) ? rekap.hariWib : tanggal.at(-1) || "";
        }
      }
      return berikut;
    });
  }, [rekap, pilihan]);

  const gambarOpsi = (bagian) => {
    const param = parameterDari(bagian.id, pilihan[bagian.id]);
    const tanggal = tanggalPilih[bagian.id];
    const papan = papanAtas(rekap, param, tanggal, provinsi);
    return {
      fitur: provinsi ? fitur.filter((item) => barisRekap(rekap, provinsi).some((baris) => baris.kode === item.kode)) : fitur,
      warna: (kode) => warnaRekap(rekap, kode, param, tanggal),
      judul: `Rekap Harian — ${bagian.judul}`,
      subjudul: `${param?.nama || ""} · ${tanggal ? formatTanggal(tanggal) : "tanpa tanggal harian"} · ${provinsi || "Seluruh Indonesia"}`,
      sumber: rekap?.sumber?.hotspot?.label || rekap?.sumber?.bmkg?.label || "",
      tabel: papan,
      catatan: catatanParameter(param),
      param,
    };
  };

  useEffect(() => {
    for (const bagian of REKAP_BAGIAN) {
      const canvas = kanvas[bagian.id].current;
      if (!canvas) continue;
      gambarRekap(canvas, gambarOpsi(bagian));
    }
  }, [rekap, pilihan, tanggalPilih, provinsi, fitur]);

  const unduhXlsx = () => {
    const bytes = xlsxLembar(lembarRekap(rekap));
    simpanBerkas(`rekap-harian-${rekap?.hariWib || "tanpa-tanggal"}.xlsx`, new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  };

  const bytesPng = async (bagian) => {
    const canvas = kanvas[bagian.id].current;
    gambarRekap(canvas, gambarOpsi(bagian));
    return pngDari(canvas);
  };

  const unduhPng = async (bagian) => {
    const bytes = await bytesPng(bagian);
    simpanBerkas(`rekap-${bagian.id}-${tanggalPilih[bagian.id] || "tanpa-tanggal"}.png`, new Blob([bytes], { type: "image/png" }));
  };

  const unduhPptx = async () => {
    const gambar = [];
    for (const bagian of REKAP_BAGIAN) gambar.push({ png: await bytesPng(bagian) });
    simpanBerkas(
      `rekap-harian-${rekap?.hariWib || "tanpa-tanggal"}.pptx`,
      new Blob([pptxRekap(gambar)], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }),
    );
  };

  return (
    <main className="wrap main">
      <header className="page-head">
        <div>
          <h1>Rekap Harian</h1>
          <p className="lead">
            Tabel harian 514 kabupaten/kota. Angka yang tidak ada ditulis {`"tidak ada data"`}. ISPU, Indeks Kesesuaian Iklim, dan rawan longsor PVMBG tetap belum terintegrasi. Hotspot utama adalah SiPongi. FIRMS ada di kolom pembanding.
          </p>
        </div>
      </header>
      <p className="rekap-note">{REKAP_IDENTITAS} {REKAP_UNDUH}</p>
      <p className="rekap-note">
        SiPongi+ (KLHK) berstatus {rekap?.sumber?.sipongi?.status || "Belum terhubung"}. {rekap?.sumber?.sipongi?.temuan}{" "}
        <a href={SIPONGI_URL}>Portal SiPongi+</a>. Kolom FIRMS berlabel {PEMBANDING_LENCANA}.
      </p>
      {galat ? <p className="banner">{galat} Baris kabupaten tetap ditampilkan.</p> : null}
      {pesan ? <p className="rekap-note">{pesan}</p> : null}
      <div className="rekap-tools">
        <label>
          Provinsi
          <select value={provinsi} onChange={(event) => setProvinsi(event.target.value)}>
            <option value="">Seluruh Indonesia</option>
            {provinsiPilihan.map((nama) => (
              <option key={nama} value={nama}>{nama}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn" onClick={unduhXlsx}>Unduh XLSX</button>
        <button type="button" className="btn" onClick={() => unduhPptx().catch((error) => setPesan(error.message))}>Unduh PPTX</button>
        <p className="fine">Cuplikan {rekap?.generated_at ? formatWib(rekap.generated_at) : "belum tersimpan"}. Hari acuan {rekap?.hariWib || "—"} WIB.</p>
      </div>
      {REKAP_BAGIAN.map((bagian) => {
        const param = parameterDari(bagian.id, pilihan[bagian.id]);
        const tanggal = tanggalParameter(rekap, param);
        const baris = barisRekap(rekap, provinsi);
        return (
          <section key={bagian.id} className="card rekap-bagian">
            <div className="mod-head">
              <h2>{bagian.judul}</h2>
              <div className="rekap-tools">
                <label>
                  Parameter
                  <select
                    value={pilihan[bagian.id]}
                    onChange={(event) => setPilihan((saat) => ({ ...saat, [bagian.id]: event.target.value }))}
                  >
                    {bagian.parameter.map((item) => (
                      <option key={item.id} value={item.id}>{item.nama}</option>
                    ))}
                  </select>
                </label>
                {tanggal.length ? (
                  <label>
                    Tanggal peta
                    <select
                      value={tanggalPilih[bagian.id]}
                      onChange={(event) => setTanggalPilih((saat) => ({ ...saat, [bagian.id]: event.target.value }))}
                    >
                      {tanggal.map((item) => (
                        <option key={item} value={item}>{formatTanggal(item)}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button type="button" className="btn" onClick={() => unduhPng(bagian).catch((error) => setPesan(error.message))}>
                  Unduh PNG 1920×1080
                </button>
              </div>
            </div>
            <p className="rekap-note">{catatanParameter(param)}</p>
            {param?.id === "irbi" || param?.id === "longsor" ? <p className="rekap-note">{IRBI_PENGGUNAAN_INTERNAL}</p> : null}
            <canvas ref={kanvas[bagian.id]} className="rekap-map" width="1920" height="1080" aria-label={`Peta ${bagian.judul}`} />
            <div className="table-wrap">
              <table className="rekap-table">
                <thead>
                  <tr>
                    <th>Provinsi</th>
                    <th>Kab/Kota</th>
                    {tanggal.length ? tanggal.map((item) => (
                      param?.id === "hotspot" ? (
                        <Fragment key={item}>
                          <th>SiPongi {formatTanggal(item)}</th>
                          <th>FIRMS pembanding {formatTanggal(item)}</th>
                        </Fragment>
                      ) : <th key={item}>{formatTanggal(item)}</th>
                    )) : <th>Nilai</th>}
                  </tr>
                </thead>
                <tbody>
                  {baris.map((item) => (
                    <tr key={item.kode}>
                      <td>{item.provinsi}</td>
                      <td>{item.nama}</td>
                      {tanggal.length ? (
                        tanggal.map((waktu) => (
                          param?.id === "hotspot" ? (
                            <Fragment key={waktu}>
                              <td>{nilaiParameter(rekap, item.kode, param, waktu)}</td>
                              <td>{nilaiParameter(rekap, item.kode, PARAM_FIRMS, waktu)}</td>
                            </Fragment>
                          ) : <td key={waktu}>{nilaiParameter(rekap, item.kode, param, waktu)}</td>
                        ))
                      ) : (
                        <td>{nilaiParameter(rekap, item.kode, param, "")}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fine">{baris.length} kabupaten/kota{provinsi ? ` di ${provinsi}` : ""}. Warna peta hanya untuk tampilan.</p>
          </section>
        );
      })}
    </main>
  );
}
