import { placeFwiTable, placeRainTable } from "../lib/attentionPrototype.js";
import { DatasetTiming } from "./DatasetTiming.jsx";
import { KualitasUdara } from "./KualitasUdara.jsx";
import { formatAngka, formatTanggalPendek } from "../lib/format.js";

const LAYERS = [
  ["hotspot", "Hotspot"],
  ["inarisk", "inaRISK"],
  ["irbi", "IRBI 2025"],
  ["asap", "Asap"],
  ["fdrs", "FDRS"],
  ["hujan", "Hujan"],
  ["angin", "Angin"],
  ["ispu", "Kualitas Udara (ISPU)"],
];

export function LayerBar({ layer, setLayer }) {
  return (
    <div className="province-filter" role="group" aria-label="Lapisan">
      {LAYERS.map(([id, label]) => (
        <button key={id} type="button" aria-pressed={layer === id} onClick={() => setLayer(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function WilayahDetail({ province, from, to, layer }) {
  if (!province) return null;
  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2>{province}</h2>
          <p>
            Periode filter {from || "—"} sampai {to || "—"}. Lapisan {layer}. Angka contoh tidak menjadi data resmi.
          </p>
        </div>
      </header>
    </section>
  );
}

export function ExtraLayers({ layer, view, feeds, province }) {
  const prakiraan = rowsFor(feeds, "bmkg_prakiraan", province);
  const cuaca = rowsFor(feeds, "fdrs_pembanding", province);
  const irbiFeed = feeds.find((feed) => feed.id === "irbi");
  const forecastFeed = feeds.find((feed) => feed.id === "bmkg_prakiraan");
  const compareWeather = feeds.find((feed) => feed.id === "fdrs_pembanding");
  const hujan14 = rowsFor(feeds, "hujan_14_pembanding", province);
  const fwiGwis = rowsFor(feeds, "fwi_gwis_pembanding", province);
  const compareRain = feeds.find((feed) => feed.id === "hujan_14_pembanding");
  const compareFwi = feeds.find((feed) => feed.id === "fwi_gwis_pembanding");

  if (layer === "inarisk") {
    return (
      <Panel title="Bahaya karhutla inaRISK" note="Tautan saja. Raster tidak digambar di peta ini.">
        <p>
          <a href="https://inarisk2.bnpb.go.id/portal/" target="_blank" rel="noreferrer">
            Portal inaRISK
          </a>
        </p>
        <p className="fine">Layanan peta berupa ImageServer, bukan tabel kabupaten. Batas resmi belum dipasang.</p>
      </Panel>
    );
  }

  if (layer === "irbi") {
    return (
      <Panel
        title="IRBI 2025"
        note={irbiFeed?.contoh ? "Angka contoh, bukan keluaran buku." : "Tabel buku tahun 2025. Tidak mengikuti filter tanggal."}
        feed={irbiFeed}
      >
        <Simple rows={view.irbiRows.map((row) => [row.kabupaten, row.provinsi, formatAngka(row.indeks, 2), row.kelas])} head={["Kabupaten", "Provinsi", "Indeks", "Kelas"]} empty="Tidak ada baris pada cakupan ini." />
      </Panel>
    );
  }

  if (layer === "asap") {
    return (
      <Panel title="Citra sebaran asap" note="Tautan saja – menunggu izin BMKG. Citra tidak diunduh dan tidak dipotong.">
        <p>
          <a href="https://www.bmkg.go.id/cuaca/satelit/citra-sebaran-asap" target="_blank" rel="noreferrer">
            Halaman BMKG
          </a>
          {" · "}
          <a href="https://inderaja.bmkg.go.id/Trajektori/Asap.png" target="_blank" rel="noreferrer">
            Berkas citra utuh
          </a>
        </p>
        <p className="fine">Sumber: BMKG. Arsip 08.00 mati sampai izin tertulis ada. Tidak ada gambar historis buatan.</p>
      </Panel>
    );
  }

  if (layer === "fdrs") {
    return (
      <>
        <Panel title="FDRS" note="Tautan saja. Citra hingga H+7 sesuai produk BMKG. Tabel di bawah masih data contoh." feed={feeds.find((feed) => feed.id === "bmkg")}>
          <p>
            <a href="https://spartan.bmkg.go.id/" target="_blank" rel="noreferrer">
              SPARTAN
            </a>
          </p>
          <Simple
            head={["Provinsi", "Tanggal", "FWI", "Kelas"]}
            empty="Tidak ada baris contoh pada rentang ini."
            rows={view.bmkgRows.map((row) => [row.provinsi, formatTanggalPendek(row.tanggal), formatAngka(row.fwi, 1), row.kelasFdrs || "—"])}
          />
        </Panel>
        <Panel title="FWI ECMWF pada titik wakil" note="Pembanding (data terbuka, bukan resmi). Bukan FDRS BMKG. Horizon mengikuti hari yang layanan isi." feed={compareFwi}>
          <Simple
            head={["Kabupaten", "FWI rata-rata", "Hari", "Periode"]}
            empty="Snapshot FWI pembanding belum ada."
            rows={placeFwiTable(fwiGwis).map((row) => [row.kabupaten, formatAngka(row.fwiRata, 1), String(row.hari), `${formatTanggalPendek(row.dari)}–${formatTanggalPendek(row.sampai)}`])}
          />
        </Panel>
        <Panel title="Cuaca harian terbuka" note="Pembanding (data terbuka, bukan resmi). Bukan FDRS." feed={compareWeather}>
          <Simple
            head={["Provinsi", "Tanggal", "Hujan", "Angin"]}
            empty="Snapshot pembanding belum ada."
            rows={cuaca.map((row) => [row.provinsi, formatTanggalPendek(row.tanggal), formatAngka(row.curahHujan, 1), formatAngka(row.anginKmj, 1)])}
          />
        </Panel>
      </>
    );
  }

  if (layer === "hujan" || layer === "angin") {
    const rain = layer === "hujan";
    return (
      <>
      <Panel
        title={rain ? "Hujan pada prakiraan 3 hari" : "Angin pada prakiraan 3 hari"}
        note={rain ? "Nilai tp per slot. Bukan peluang persen. Sumber: BMKG." : "Arah dan kecepatan (km/jam). Bukan asal kebakaran. Sumber: BMKG."}
        feed={forecastFeed}
      >
        <Simple
          head={rain ? ["Lokasi", "Waktu", "Cuaca", "tp"] : ["Lokasi", "Waktu", "Arah", "km/jam"]}
          empty="Snapshot prakiraan belum ada."
          rows={prakiraan.slice(0, 24).map((row) =>
            rain
              ? [`${row.desa}, ${row.provinsi}`, row.waktuLokal, row.cuaca, formatAngka(row.curahHujan, 1)]
              : [`${row.desa}, ${row.provinsi}`, row.waktuLokal, row.arahAngin, formatAngka(row.anginKmj, 1)],
          )}
        />
        <p className="fine">Satu kelurahan ibu kota tiap provinsi prioritas. Horizon 3 hari, bukan 14 hari.</p>
      </Panel>
      {rain ? (
        <Panel title="Hujan dan angin 14 hari pada titik wakil" note="Pembanding (data terbuka, bukan resmi). Bukan peluang atau angin BMKG." feed={compareRain}>
          <Simple
            head={["Kabupaten", "Hujan (mm)", "Hari di bawah 1 mm", "Angin maks"]}
            empty="Snapshot hujan 14 hari belum ada."
            rows={placeRainTable(hujan14).map((row) => [row.kabupaten, formatAngka(row.hujanMm, 1), `${row.hariKering}/${row.hariNilai}`, formatAngka(row.anginMaks, 0)])}
          />
          <p className="fine">Titik wakil Satu Data, zona tanggal Asia/Jakarta. Bukan batas kabupaten.</p>
        </Panel>
      ) : (
        <Panel title="Angin 14 hari pada titik wakil" note="Pembanding (data terbuka, bukan resmi). Kecepatan maksimum harian, bukan arah BMKG." feed={compareRain}>
          <Simple
            head={["Kabupaten", "Angin maks (km/jam)", "Periode"]}
            empty="Snapshot angin 14 hari belum ada."
            rows={placeRainTable(hujan14).map((row) => [row.kabupaten, formatAngka(row.anginMaks, 0), `${formatTanggalPendek(row.dari)}–${formatTanggalPendek(row.sampai)}`])}
          />
        </Panel>
      )}
    </>
    );
  }

  if (layer === "ispu") {
    return <KualitasUdara feeds={feeds} province={province} />;
  }

  return null;
}

function rowsFor(feeds, id, province) {
  const rows = feeds.find((feed) => feed.id === id)?.rows ?? [];
  if (!province) return rows;
  return rows.filter((row) => row.provinsi === province);
}

function Panel({ title, note, feed, children }) {
  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2>{title}</h2>
          <p>{note}</p>
        </div>
      </header>
      <div className="logic-body">
        <DatasetTiming feed={feed} />
        {children}
      </div>
    </section>
  );
}

function Simple({ head, rows, empty }) {
  return (
    <div className="table-wrap short">
      <table>
        <thead>
          <tr>
            {head.map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={`${row[0]}-${index}`}>
                {row.map((cell, cellIndex) =>
                  cellIndex === 0 ? (
                    <th key={cellIndex} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={cellIndex}>{cell}</td>
                  ),
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={head.length}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
